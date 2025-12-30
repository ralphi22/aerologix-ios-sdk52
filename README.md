# AeroLogix AI ✈️  
Application mobile de gestion de maintenance aéronautique intelligente

---

## 🎯 Vue d’ensemble

**AeroLogix AI** est une application mobile conçue pour les pilotes et propriétaires
d’avions légers privés, destinée à **organiser**, **centraliser** et **visualiser**
les informations de maintenance aéronautique.

L’application agit comme un **outil d’aide à l’organisation** et **ne remplace jamais**
un carnet de bord officiel, un TEA / AME, ni Transport Canada.

---

## 📱 Plateformes

- ✅ iOS (TestFlight → App Store)
- ⏳ Android (prévu)
- ⏳ Web (prévu)

> Ce dépôt contient **exclusivement le frontend iOS**.

---

## 🏗️ Architecture technique

### Frontend
- Expo (React Native) — **Managed Workflow uniquement**
- TypeScript
- Expo Router
- Stockage sécurisé (SecureStore)

### Backend (externe)
- FastAPI (Python)
- MongoDB
- Hébergement : Render

### IA
- Analyse assistée (OCR, suggestions, résumés)
- **Jamais décisionnelle**
- Toujours validable par l’utilisateur

---

## ⚙️ Configuration technique (VERROUILLÉE)

⚠️ **Ces versions ne doivent jamais être modifiées sans décision explicite.**

- Expo SDK : **52.x**
- React : **18.3.1**
- React Native : **0.76.9**
- Plateforme cible : **iOS**
- Tests : **iPhone réel via TestFlight**

❌ Aucune migration SDK  
❌ Aucun plugin natif non validé  
❌ Aucun contournement EAS / Apple  
❌ Expo Go non utilisé  

Ce dépôt est la **source de vérité iOS**.

---

## 🧭 Fonctionnalités principales

- 📸 **OCR intelligent**
  - Scan de rapports de maintenance
  - Données toujours validables par l’utilisateur

- 📊 **Carnet numérique**
  - Heures de vol
  - Suivi des entretiens

- 🔔 **Alertes informatives**
  - TBO
  - ELT
  - Inspections périodiques

- ✈️ **Gestion multi-avions**
  - Selon le forfait actif

- 🤖 **IA assistante**
  - Résumés
  - Suggestions
  - Aide à la lecture
  - **Jamais une décision de navigabilité**

---

## 🔐 Sécurité & conformité

- Authentification sécurisée (JWT)
- Stockage chiffré des données sensibles
- HTTPS obligatoire
- Aucune revente ou exploitation publicitaire des données

---

## ⚠️ Avis important (TC-Safe)

AeroLogix AI est un **outil d’organisation et d’information uniquement**.

L’application :
- ❌ ne certifie pas la navigabilité
- ❌ ne remplace pas un carnet de bord officiel
- ❌ ne remplace pas un TEA / AME
- ❌ ne prend aucune décision réglementaire

La responsabilité finale demeure toujours celle du propriétaire et des professionnels certifiés.

---

## 🌐 Backend

L’API est configurée via :

```json
extra.apiUrl

Aucune logique backend n’est contenue dans ce dépôt.

💰 Plans d’abonnement (indicatif)

🆓 Basic

✈️ Pilote

🔧 Maintenance Pro

🚁 Fleet AI

Les détails sont gérés côté backend et App Store.

📦 Build & déploiement
Build iOS (TestFlight)
npx eas build -p ios --profile production

Soumission App Store
npx eas submit -p ios

🔐 Politique de confidentialité

AeroLogix AI respecte la vie privée des utilisateurs.

Données collectées

Adresse e-mail (authentification)

Données fournies par l’utilisateur :

aéronefs

documents

images

dossiers de maintenance

Utilisation

Les données sont utilisées uniquement pour :

fournir l’accès à l’application

stocker et afficher les dossiers de l’utilisateur

activer les fonctionnalités internes

Partage

AeroLogix AI :

❌ ne vend pas les données

❌ ne fait aucun suivi publicitaire

❌ ne partage pas les données à des tiers

Sécurité

Les données sont stockées de manière sécurisée et accessibles uniquement
aux systèmes autorisés.

Contact

📧 support@aerologix.ai

📄 Licence

© 2025 AeroLogix AI
Tous droits réservés.

🙏 Remerciements

Expo

FastAPI

OpenAI (via Emergent)

Stripe

Conçu avec rigueur ✈️

```json
extra.apiUrl


