FROM node:20-alpine

# Δημιουργία και ορισμός του φακέλου εργασίας μέσα στο container
WORKDIR /usr/src/app

# Αντιγραφή package.json και εγκατάσταση εξαρτήσεων
COPY package*.json ./
RUN npm install

# Αντιγραφή όλου του υπόλοιπου κώδικα του backend
COPY . .

# Άνοιγμα της πόρτας που τρέχει το API (συνήθως 3000)
EXPOSE 3000

# Εντολή εκκίνησης
CMD ["npm", "start"]
