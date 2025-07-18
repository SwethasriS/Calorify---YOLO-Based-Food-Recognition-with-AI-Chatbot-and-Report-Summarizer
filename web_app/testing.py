import ollama

def generate_recipe(ingredients, meal_type):
    """Generates a recipe using Ollama's Llama3 model."""
    prompt = f"Create a {meal_type} recipe using these ingredients: {', '.join(ingredients)}. Provide a title, ingredients list, and step-by-step instructions."

    response = ollama.chat(
        model="llama3",  # Use "mistral" or "gemma" if needed
        messages=[{"role": "user", "content": prompt}]
    )

    return response["message"]["content"]

if __name__ == "__main__":
    ingredients = input("Enter ingredients (comma separated): ").split(",")
    ingredients = [ingredient.strip() for ingredient in ingredients]
    meal_type = input("Enter meal type (e.g., breakfast, lunch, dinner, dessert): ")

    try:
        recipe = generate_recipe(ingredients, meal_type)
        print("\n🍽 Generated Recipe:\n")
        print(recipe)
    except Exception as e:
        print(f"An error occurred: {e}")
