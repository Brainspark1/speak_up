from transformers import pipeline
text = input('Type something: ')
classifier = pipeline("ner", model="Saggarwal/GAMEBERT")
print(classifier(text))
