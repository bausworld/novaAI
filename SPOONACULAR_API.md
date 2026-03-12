# Spoonacular Recipe API Integration

## Overview
Nova uses the [Spoonacular Recipe API](https://spoonacular.com/food-api) via RapidAPI to search for recipes, retrieve full nutrition data, and save them to the 1YearChef Supabase database. Each recipe is enriched with a Stability AI–generated hero image.

## API Access
- **Host:** `spoonacular-recipe-food-nutrition-v1.p.rapidapi.com`
- **Auth Header:** `x-rapidapi-key` (uses existing `RAPIDAPI_KEY` from `.env.local`)
- **Base URL:** `https://spoonacular-recipe-food-nutrition-v1.p.rapidapi.com`

## Endpoints Used

### 1. Complex Search
```
GET /recipes/complexSearch
```
**Query Params:**
| Param | Type | Description |
|---|---|---|
| `query` | string | Recipe search term (e.g. "chicken tikka masala") |
| `number` | int | Number of results (1–10, default 1) |
| `addRecipeNutrition` | bool | Include full nutrition breakdown |
| `addRecipeInstructions` | bool | Include step-by-step instructions |
| `fillIngredients` | bool | Include full ingredient details with measures |

**Response Shape:**
```json
{
  "results": [
    {
      "id": 782601,
      "title": "Red Kidney Bean Jambalaya",
      "image": "https://img.spoonacular.com/recipes/...",
      "readyInMinutes": 45,
      "servings": 6,
      "vegetarian": true,
      "vegan": true,
      "glutenFree": true,
      "dairyFree": true,
      "healthScore": 96.0,
      "diets": ["gluten free", "dairy free", "vegan"],
      "cuisines": ["Creole", "Cajun"],
      "dishTypes": ["lunch", "main course", "dinner"],
      "extendedIngredients": [
        {
          "original": "2/3 cup dried brown rice (2 cups cooked)",
          "name": "brown rice",
          "amount": 2.0,
          "unit": "cups"
        }
      ],
      "analyzedInstructions": [
        {
          "steps": [
            { "number": 1, "step": "Rinse the kidney beans..." }
          ]
        }
      ],
      "nutrition": {
        "nutrients": [
          { "name": "Calories", "amount": 392.8, "unit": "kcal" },
          { "name": "Fat", "amount": 6.45, "unit": "g" },
          { "name": "Protein", "amount": 18.13, "unit": "g" },
          { "name": "Carbohydrates", "amount": 69.36, "unit": "g" },
          { "name": "Fiber", "amount": 16.25, "unit": "g" },
          { "name": "Sodium", "amount": 1111.47, "unit": "mg" },
          { "name": "Sugar", "amount": 10.19, "unit": "g" },
          { "name": "Cholesterol", "amount": 0.0, "unit": "mg" },
          { "name": "Saturated Fat", "amount": 0.96, "unit": "g" },
          { "name": "Iron", "amount": 6.09, "unit": "mg" },
          { "name": "Calcium", "amount": 118.78, "unit": "mg" },
          { "name": "Potassium", "amount": 1435.41, "unit": "mg" },
          { "name": "Vitamin A", "amount": 5050.2, "unit": "IU" },
          { "name": "Vitamin C", "amount": 45.07, "unit": "mg" },
          { "name": "Vitamin K", "amount": 47.85, "unit": "µg" }
        ]
      }
    }
  ]
}
```

## Supabase `recipes` Table Schema
```sql
id              uuid PRIMARY KEY
slug            text NOT NULL
title           text NOT NULL
tagline         text
description     text
servings        text
prep_time       text
cook_time       text
total_time      text
image_url       text
ingredients     text[]
instructions    text[]
tips            text[]
tags            text[]
rating          numeric
nutrition       jsonb
related_recipe_slugs text[]
created_at      timestamptz
updated_at      timestamptz
```

## Data Mapping (Spoonacular → Supabase)

| Supabase Field | Source |
|---|---|
| `slug` | Kebab-cased `title` |
| `title` | `title` |
| `tagline` | Generated from cuisines + dishTypes |
| `description` | `summary` (HTML stripped) or LLM-generated |
| `servings` | `servings` (as string) |
| `prep_time` | `preparationMinutes` + " min" (or estimated from readyInMinutes) |
| `cook_time` | `cookingMinutes` + " min" (or estimated) |
| `total_time` | `readyInMinutes` + " min" |
| `image_url` | Stability AI generated image (uploaded to Supabase Storage) |
| `ingredients` | `extendedIngredients[].original` |
| `instructions` | `analyzedInstructions[0].steps[].step` |
| `tips` | LLM-generated cooking tips |
| `tags` | Combined `diets` + `cuisines` + `dishTypes` |
| `rating` | `healthScore / 20` (1–5 scale) |
| `nutrition` | Mapped from `nutrition.nutrients[]` — holistic set |

## Nutrition Object (Holistic)
```json
{
  "calories": 393,
  "protein": "18g",
  "carbs": "69g",
  "fat": "6g",
  "fiber": "16g",
  "sodium": "1111mg",
  "sugar": "10g",
  "cholesterol": "0mg",
  "saturatedFat": "1g",
  "iron": "6mg",
  "calcium": "119mg",
  "potassium": "1435mg",
  "vitaminA": "5050IU",
  "vitaminC": "45mg",
  "vitaminK": "48µg"
}
```

## Nova Integration Flow
1. User says: "add a recipe for chicken tikka masala"
2. Nova detects `wantsRecipe` intent
3. Calls `/api/recipes` with action `search` → Spoonacular complexSearch
4. Generates a hero image via Stability AI using the recipe title
5. Maps Spoonacular data to Supabase schema
6. Inserts into Supabase `recipes` table
7. Displays `RecipeCard` in chat with image, ingredients, nutrition, and tags
8. Shows confirmation with link to 1yearchef.com/recipes/{slug}

## Rate Limits
- Free tier: 150 requests/day
- Pro tier: 5000 requests/day
