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


