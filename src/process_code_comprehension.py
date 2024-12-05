import json
import os

def process_code_comprehension():
    # Load the NDJSON file
    file_path = os.path.join(os.path.dirname(__file__), '../code_comprehension.json')
    with open(file_path, 'r') as f:
        data = [json.loads(line) for line in f]  # Parse each line as a JSON object
    return data


def process_code_comprehension_file_path(file_path):
    # Load the NDJSON file
    with open(file_path, 'r') as f:
        data = [json.loads(line) for line in f]  # Parse each line as a JSON object
    return data

def filter_short_choices(data, max_length=15):
    filtered_data = []

    # Filter out where all choices have at most max_length characters
    for item in data:
        if all(len(choice) <= max_length for choice in item['choices']):
            filtered_data.append(item)

    return filtered_data

def pretty_print(row):
    # Parse the NDJSON string into a Python dictionary
    data = json.loads(row)

    # Access and present each key-value pair
    print("Question:")
    print(data["question"])  # Display the question with its newlines preserved
    print("\nChoices:")
    for idx, choice in enumerate(data["choices"], start=1):
        print(f"{idx}. {choice}")  # Enumerate the choices
    print("\nCorrect Answer:")
    print(data["correct_answer"])  # Display the correct answer

# Function to evaluate question difficulty
def evaluate_questions(data):
    intermediate_questions = []
    basic_questions = []

    for item in data:
        question = item.get("question", "")
        choices = item.get("choices", [])
        correct_answer = item.get("correct_answer", "")

        # Evaluate based on presence of concepts (loops, conditionals, etc.)
        if any(keyword in question for keyword in ["for", "while", "if", "elif", "else"]):
            # Further refine for intermediate level by ensuring complexity
            if len(choices) > 3 and any(op in question for op in ["//", "%", "**", "+=", "-="]):
                intermediate_questions.append(item)
            else:
                basic_questions.append(item)
        else:
            basic_questions.append(item)

    return intermediate_questions, basic_questions

def check_snippet_language():
    # if there's "python" in questions, then it's a Python snippet
    all_data = process_code_comprehension()

    arr = []

    for item in all_data:
        if "python" in item["question"].lower():
            # append index of the question with True
            arr.append((all_data.index(item), True))
        else:
            arr.append((all_data.index(item), False))

    # Count the number of True and False values
    true_count = sum(1 for _, is_python in arr if is_python)
    false_count = sum(1 for _, is_python in arr if not is_python)

    return arr, true_count, false_count

if __name__ == '__main__':
    all_data = process_code_comprehension()

    # replace "python" with "" in all questions
    for item in all_data:
        item["question"] = item["question"].replace("python", "")

    # Filter out where all choices have at most n characters
    filtered_data = filter_short_choices(all_data, max_length=5)

    print("All data length:", len(all_data))
    print("Filtered data length:", len(filtered_data))

    # Filter out where questions have fewer than 20 lines of code
    filtered_snippet_data = [item for item in filtered_data if item["question"].count('\n') <= 20]

    print("Filtered snippet data length:", len(filtered_snippet_data))

    # Pretty print the first item in the filtered data
    # pretty_print(json.dumps(filtered_data[0]))

    # pretty_print(json.dumps(all_data[0]))

    # arr, true_count, false_count = check_snippet_language()
    # # print(arr)
    # print(true_count)
    # print(false_count)

    # intermediate_questions, basic_questions = evaluate_questions(filtered_data)
    

    # export intermediate questions to a new file in pretty format
    # file_path = os.path.join(os.path.dirname(__file__), '../intermediate_code_comprehension.txt')
    # with open(file_path, 'w') as f:
    #     for item in intermediate_questions:
    #         # pretty print the item
    #         data = item

    #         f.write("Question:\n")
    #         f.write(data["question"] + '\n')
    #         f.write("\nChoices:\n")
    #         for idx, choice in enumerate(data["choices"], start=1):
    #             f.write(f"{idx}. {choice}\n")
    #         f.write("\nCorrect Answer:\n")
    #         f.write(data["correct_answer"] + '\n\n')

    # # export filtered data to a new file
    # file_path = os.path.join(os.path.dirname(__file__), '../filtered_code_comprehension.json')
    # with open(file_path, 'w') as f:
    #     for item in filtered_data:
    #         f.write(json.dumps(item) + '\n')  # Write each item as a JSON string


    data = process_code_comprehension_file_path("C:\\Users\\thien\\Downloads\\code_comprehension_questions_gpt.json")

    # replace "python" with "" in all questions
    for item in data:
        item["question"] = item["question"].replace("python", "")
    

    # shuffle both the data (from gpt) and filtered_data (from huggingface)
    length_data = len(data)
    length_filtered_data = len(filtered_data)

    print("Length of gpt data:", length_data)
    print("Length of huggingface data:", length_filtered_data)

    import random
    random.shuffle(filtered_data)

    # grab from filtered_data the same length as data
    filtered_data = filtered_data[:length_data]

    # shuffle data
    random.shuffle(data)

    # combine both data
    combined_data = data + filtered_data

    # pretty print the first item in the combined data
    pretty_print(json.dumps(combined_data[0]))

    # # write to a new file
    # file_path = os.path.join(os.path.dirname(__file__), '../ultimate_code_comprehension_set.json')
    # with open(file_path, 'w') as f:
    #     for item in combined_data:
    #         f.write(json.dumps(item) + '\n')  # Write each item as a JSON string


