# Στάδιο 1: Χτίσιμο της εφαρμογής (Build process)
FROM node:20-alpine AS build
WORKDIR /app

# Εγκατάσταση εξαρτήσεων
COPY package*.json ./
RUN npm install

# Αντιγραφή όλου του κώδικα και δημιουργία του production build
COPY . .
RUN npm run build -- --configuration=production

# Στάδιο 2: Nginx για να σερβίρει τα στατικά αρχεία που χτίσαμε στο προηγούμενο στάδιο
FROM nginx:alpine

# Αντιγραφή του δικού μας Configuration για το Angular Routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Αντιγραφή από το προηγούμενο στάδιο ("build") στον φάκελο του Nginx. 
# Σημείωση: Ανάλογα την έκδοση Angular η διαδρομή μπορεί να είναι /app/dist/frontend/browser
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html

# Άνοιγμα της πόρτας
EXPOSE 80

# Εντολή εκκίνησης Nginx
CMD ["nginx", "-g", "daemon off;"]
