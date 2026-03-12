import { NextRequest, NextResponse } from "next/server";
import { getSupabase, getSupabaseAdmin } from "@/lib/supabase";

function getConfig() {
  return {
    rapidApiKey: process.env.RAPIDAPI_KEY || "",
    stabilityKey: process.env.STABILITY_API_KEY || "",
  };
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

interface SpoonNutrient {
  name: string;
  amount: number;
  unit: string;
}

function roundNutrient(amount: number, unit: string): string {
  const rounded = Math.round(amount);
  return `${rounded}${unit}`;
}

function mapNutrition(nutrients: SpoonNutrient[]): Record<string, string | number> {
  const find = (name: string) => nutrients.find((n) => n.name.toLowerCase() === name.toLowerCase());

  const cal = find("Calories");
  const protein = find("Protein");
  const carbs = find("Carbohydrates");
  const fat = find("Fat");
  const fiber = find("Fiber");
  const sodium = find("Sodium");
  const sugar = find("Sugar");
  const cholesterol = find("Cholesterol");
  const satFat = find("Saturated Fat");
  const iron = find("Iron");
  const calcium = find("Calcium");
  const potassium = find("Potassium");
  const vitA = find("Vitamin A");
  const vitC = find("Vitamin C");
  const vitK = find("Vitamin K");

  return {
    calories: cal ? Math.round(cal.amount) : 0,
    protein: protein ? roundNutrient(protein.amount, protein.unit) : "0g",
    carbs: carbs ? roundNutrient(carbs.amount, carbs.unit) : "0g",
    fat: fat ? roundNutrient(fat.amount, fat.unit) : "0g",
    fiber: fiber ? roundNutrient(fiber.amount, fiber.unit) : "0g",
    sodium: sodium ? roundNutrient(sodium.amount, sodium.unit) : "0mg",
    sugar: sugar ? roundNutrient(sugar.amount, sugar.unit) : "0g",
    cholesterol: cholesterol ? roundNutrient(cholesterol.amount, cholesterol.unit) : "0mg",
    saturatedFat: satFat ? roundNutrient(satFat.amount, satFat.unit) : "0g",
    iron: iron ? roundNutrient(iron.amount, iron.unit) : "0mg",
    calcium: calcium ? roundNutrient(calcium.amount, calcium.unit) : "0mg",
    potassium: potassium ? roundNutrient(potassium.amount, potassium.unit) : "0mg",
    vitaminA: vitA ? roundNutrient(vitA.amount, vitA.unit) : "0IU",
    vitaminC: vitC ? roundNutrient(vitC.amount, vitC.unit) : "0mg",
    vitaminK: vitK ? roundNutrient(vitK.amount, vitK.unit) : "0µg",
  };
}

async function generateRecipeImage(title: string, stabilityKey: string): Promise<string | null> {
  if (!stabilityKey) return null;

  const prompt = `Professional food photography of ${title}, beautifully plated, top-down view, warm natural lighting, wooden table background, appetizing, high resolution, editorial food magazine style`;

  try {
    const res = await fetch(
      "https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${stabilityKey}`,
          Accept: "application/json",
        },
        body: JSON.stringify({
          text_prompts: [
            { text: prompt, weight: 1 },
            { text: "blurry, bad quality, distorted, ugly, deformed, text, watermark, logo", weight: -1 },
          ],
          cfg_scale: 7,
          width: 1024,
          height: 1024,
          steps: 30,
          samples: 1,
        }),
        signal: AbortSignal.timeout(60000),
      }
    );

    if (!res.ok) return null;

    const data = await res.json();
    const image = data.artifacts?.[0];
    if (!image?.base64) return null;

    return `data:image/png;base64,${image.base64}`;
  } catch {
    return null;
  }
}

async function searchSpoonacular(query: string, rapidApiKey: string) {
  const url = new URL("https://spoonacular-recipe-food-nutrition-v1.p.rapidapi.com/recipes/complexSearch");
  url.searchParams.set("query", query);
  url.searchParams.set("number", "3");
  url.searchParams.set("addRecipeNutrition", "true");
  url.searchParams.set("addRecipeInstructions", "true");
  url.searchParams.set("fillIngredients", "true");

  const res = await fetch(url.toString(), {
    headers: {
      "x-rapidapi-host": "spoonacular-recipe-food-nutrition-v1.p.rapidapi.com",
      "x-rapidapi-key": rapidApiKey,
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Spoonacular API error ${res.status}: ${errText}`);
  }

  return res.json();
}

// POST: Search recipe, generate image, save to Supabase
export async function POST(req: NextRequest) {
  const { rapidApiKey, stabilityKey } = getConfig();

  if (!rapidApiKey) {
    return NextResponse.json({ error: "RapidAPI key not configured" }, { status: 500 });
  }

  try {
    const { query, selected } = await req.json();
    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Missing recipe query" }, { status: 400 });
    }

    // 1. Search Spoonacular for 3 options
    const spoonData = await searchSpoonacular(query, rapidApiKey);
    const options = (spoonData?.results || []).slice(0, 3);
    if (!options.length) {
      return NextResponse.json({ error: "No recipe found for that search" }, { status: 404 });
    }

    // If no selection yet, return options for user to pick
    if (selected === undefined) {
      return NextResponse.json({
        options: options.map((r: any, i: number) => ({
          index: i,
          title: r.title,
          image: r.image,
          summary: r.summary ? r.summary.replace(/<[^>]+>/g, "").slice(0, 200) : "",
          readyInMinutes: r.readyInMinutes,
          servings: r.servings,
        })),
        pick: true,
      });
    }

    // Otherwise, add the selected recipe
    const recipe = options[selected];
    if (!recipe) {
      return NextResponse.json({ error: "Invalid selection" }, { status: 400 });
    }

    const slug = slugify(recipe.title);
    // 2. Check if recipe already exists in Supabase
    const db = getSupabaseAdmin();
    const { data: existing } = await db
      .from("recipes")
      .select("id, slug")
      .eq("slug", slug)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        error: "duplicate",
        message: `Recipe \"${recipe.title}\" already exists`,
        slug: existing.slug,
      }, { status: 409 });
    }

    // 3. Generate image via Stability AI
    const imageDataUrl = await generateRecipeImage(recipe.title, stabilityKey);

    // 4. Upload image to Supabase Storage if generated
    let imageUrl = recipe.image || "";
    if (imageDataUrl) {
      try {
        const base64 = imageDataUrl.split(",")[1];
        const buffer = Buffer.from(base64, "base64");
        const filePath = `recipe-images/${slug}.png`;

        const { error: uploadError } = await db.storage
          .from("images")
          .upload(filePath, buffer, {
            contentType: "image/png",
            upsert: true,
          });

        if (!uploadError) {
          const { data: urlData } = db.storage
            .from("images")
            .getPublicUrl(filePath);
          if (urlData?.publicUrl) {
            imageUrl = urlData.publicUrl;
          }
        }
      } catch {
        // Fall back to Spoonacular image
      }
    }

    // 5. Map data to Supabase schema
    const ingredients: string[] = (recipe.extendedIngredients || []).map(
      (ing: { original: string }) => ing.original
    );

    const instructions: string[] = [];
    for (const group of recipe.analyzedInstructions || []) {
      for (const step of group.steps || []) {
        instructions.push(step.step);
      }
    }

    const nutritionData = mapNutrition(recipe.nutrition?.nutrients || []);

    // Build tags from diets + cuisines + dishTypes
    const tags: string[] = [
      ...(recipe.cuisines || []),
      ...(recipe.diets || []).map((d: string) => {
        // Capitalize diet names nicely
        if (d === "lacto ovo vegetarian") return "Vegetarian";
        return d.split(" ").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      }),
      ...(recipe.dishTypes || []).map((d: string) =>
        d.split(" ").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
      ),
    ];
    // Deduplicate
    const uniqueTags = [...new Set(tags)];

    // Build tagline from cuisines + primary dish type
    const cuisineStr = (recipe.cuisines || []).join(" & ");
    const primaryDish = (recipe.dishTypes || [])[0] || "dish";
    const tagline = cuisineStr
      ? `${cuisineStr} ${primaryDish}`
      : recipe.vegan ? "Vegan " + primaryDish
      : recipe.vegetarian ? "Vegetarian " + primaryDish
      : primaryDish.charAt(0).toUpperCase() + primaryDish.slice(1);

    // Estimate prep/cook time
    const readyMin = recipe.readyInMinutes || 0;
    const prepMin = recipe.preparationMinutes || Math.round(readyMin * 0.3);
    const cookMin = recipe.cookingMinutes || (readyMin - prepMin);

    const tips: string[] = [];
    if (recipe.veryHealthy) tips.push("This is an exceptionally healthy recipe with a high nutrition score.");
    if (recipe.dairyFree) tips.push("This recipe is naturally dairy-free.");
    if (recipe.glutenFree) tips.push("This recipe is gluten-free friendly.");
    tips.push("Prep all ingredients before you start cooking.");
    tips.push("Taste as you go and adjust seasoning to your preference.");

    const rating = Math.min(5, Math.max(1, Math.round((recipe.healthScore || 50) / 20 * 10) / 10));

    const now = new Date().toISOString();
    const recipeRow = {
      slug,
      title: recipe.title,
      tagline,
      description: recipe.summary
        ? recipe.summary.replace(/<[^>]+>/g, "").slice(0, 300)
        : `A delicious ${tagline} recipe.`,
      servings: String(recipe.servings || "4"),
      prep_time: prepMin > 0 ? `${prepMin} min` : null,
      cook_time: cookMin > 0 ? `${cookMin} min` : null,
      total_time: readyMin > 0 ? `${readyMin} min` : null,
      image_url: imageUrl,
      ingredients,
      instructions,
      tips,
      tags: uniqueTags,
      rating,
      nutrition: nutritionData,
      related_recipe_slugs: [],
      created_at: now,
      published_at: now,
    };

    // 6. Insert into Supabase
    const { data: inserted, error: insertError } = await db
      .from("recipes")
      .insert(recipeRow)
      .select()
      .single();

    if (insertError) {
      console.error("Supabase insert error:", insertError);
      return NextResponse.json({ error: `Database error: ${insertError.message}` }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      recipe: inserted,
      imageGenerated: !!imageDataUrl,
    });
  } catch (err) {
    console.error("Recipe API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Recipe search failed" },
      { status: 500 }
    );
  }
}


