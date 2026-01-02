/**
 * Edit Aircraft Screen
 * Includes photo selection for aircraft image
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { t, getLanguage } from '@/i18n';
import { useAircraftLocalStore } from '@/stores/aircraftLocalStore';

const COLORS = {
  primary: '#0033A0',
  background: '#F5F5F5',
  white: '#FFFFFF',
  textDark: '#11181C',
  textMuted: '#6C757D',
  border: '#E0E0E0',
  hint: '#9E9E9E',
  blue: '#E3F2FD',
  green: '#4CAF50',
  red: '#E53935',
};

interface FormFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  hint?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'numeric' | 'email-address';
}

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  hint,
  autoCapitalize = 'sentences',
  keyboardType = 'default',
}: FormFieldProps) {
  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.fieldInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
      />
      {hint && <Text style={styles.fieldHint}>{hint}</Text>}
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

export default function EditAircraftScreen() {
  const router = useRouter();
  const { aircraftId } = useLocalSearchParams<{ aircraftId: string }>();
  const { getAircraftById, updateAircraft } = useAircraftLocalStore();
  const lang = getLanguage();

  const aircraft = getAircraftById(aircraftId || '');

  // Form state
  const [registration, setRegistration] = useState('');
  const [commonName, setCommonName] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [category, setCategory] = useState('');
  const [engineType, setEngineType] = useState('');
  const [maxWeight, setMaxWeight] = useState('');
  const [baseOperations, setBaseOperations] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [countryManufacture, setCountryManufacture] = useState('');
  const [yearManufacture, setYearManufacture] = useState('');
  const [registrationType, setRegistrationType] = useState('');
  const [ownerSince, setOwnerSince] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [airframeHours, setAirframeHours] = useState('');
  const [engineHours, setEngineHours] = useState('');
  const [propellerHours, setPropellerHours] = useState('');
  const [photoUri, setPhotoUri] = useState<string | undefined>(undefined);

  // Load aircraft data
  useEffect(() => {
    if (aircraft) {
      setRegistration(aircraft.registration);
      setCommonName(aircraft.commonName);
      setModel(aircraft.model);
      setSerialNumber(aircraft.serialNumber);
      setCategory(aircraft.category);
      setEngineType(aircraft.engineType);
      setMaxWeight(aircraft.maxWeight);
      setBaseOperations(aircraft.baseOperations);
      setManufacturer(aircraft.manufacturer);
      setCountryManufacture(aircraft.countryManufacture);
      setYearManufacture(aircraft.yearManufacture);
      setRegistrationType(aircraft.registrationType);
      setOwnerSince(aircraft.ownerSince);
      setAddressLine1(aircraft.addressLine1);
      setAddressLine2(aircraft.addressLine2);
      setCity(aircraft.city);
      setCountry(aircraft.country);
      setAirframeHours(aircraft.airframeHours.toString());
      setEngineHours(aircraft.engineHours.toString());
      setPropellerHours(aircraft.propellerHours.toString());
      setPhotoUri(aircraft.photoUri);
    }
  }, [aircraft]);

  // Request media library permissions
  const requestMediaPermission = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        lang === 'fr' ? 'Permission requise' : 'Permission Required',
        lang === 'fr' 
          ? 'L\'accès aux photos est nécessaire pour sélectionner une image.'
          : 'Photo library access is required to select an image.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  // Request camera permissions
  const requestCameraPermission = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        lang === 'fr' ? 'Permission requise' : 'Permission Required',
        lang === 'fr' 
          ? 'L\'accès à la caméra est nécessaire pour prendre une photo.'
          : 'Camera access is required to take a photo.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  // Take photo with camera
  const takePhoto = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (error) {
      console.log('Camera error:', error);
    }
  };

  // Pick image from library
  const pickImage = async () => {
    const hasPermission = await requestMediaPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (error) {
      console.log('Image picker error:', error);
    }
  };

  // Show photo options
  const handlePhotoPress = () => {
    Alert.alert(
      lang === 'fr' ? 'Photo de l\'avion' : 'Aircraft Photo',
      lang === 'fr' ? 'Choisir une source' : 'Choose a source',
      [
        {
          text: lang === 'fr' ? 'Prendre une photo' : 'Take Photo',
          onPress: takePhoto,
        },
        {
          text: lang === 'fr' ? 'Choisir une image' : 'Choose Image',
          onPress: pickImage,
        },
        ...(photoUri ? [{
          text: lang === 'fr' ? 'Supprimer' : 'Remove',
          style: 'destructive' as const,
          onPress: () => setPhotoUri(undefined),
        }] : []),
        {
          text: lang === 'fr' ? 'Annuler' : 'Cancel',
          style: 'cancel' as const,
        },
      ]
    );
  };

  if (!aircraft) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {lang === 'fr' ? 'Avion non trouvé' : 'Aircraft not found'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleSave = () => {
    if (!registration.trim()) {
      Alert.alert('Error', lang === 'fr' ? "L'immatriculation est requise" : 'Registration is required');
      return;
    }

    updateAircraft(aircraftId || '', {
      registration: registration.toUpperCase(),
      commonName,
      model,
      serialNumber,
      category,
      engineType,
      maxWeight,
      baseOperations,
      manufacturer,
      countryManufacture,
      yearManufacture,
      registrationType,
      ownerSince,
      addressLine1,
      addressLine2,
      city,
      country,
      airframeHours: parseFloat(airframeHours) || 0,
      engineHours: parseFloat(engineHours) || 0,
      propellerHours: parseFloat(propellerHours) || 0,
      photoUri,
    });

    router.back();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Text style={styles.headerBackText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {lang === 'fr' ? "Modifier l'avion" : 'Edit Aircraft'}
        </Text>
        <View style={styles.headerRight} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* SECTION: Photo */}
          <SectionHeader title={lang === 'fr' ? 'Photo' : 'Photo'} />
          <View style={styles.photoSection}>
            <TouchableOpacity style={styles.photoContainer} onPress={handlePhotoPress}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.photoImage} resizeMode="cover" />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Text style={styles.photoIcon}>📷</Text>
                  <Text style={styles.photoText}>
                    {lang === 'fr' ? 'Ajouter une photo' : 'Add a photo'}
                  </Text>
                  <Text style={styles.photoHint}>
                    {lang === 'fr' ? 'Visible en filigrane sur la carte' : 'Visible as watermark on card'}
                  </Text>
                </View>
              )}
              <View style={styles.photoEditBadge}>
                <Text style={styles.photoEditText}>✏️</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* SECTION: Identity */}
          <SectionHeader title={t('section_identity')} />
          <View style={styles.section}>
            <FormField
              label={t('registration')}
              value={registration}
              onChangeText={(text) => setRegistration(text.toUpperCase())}
              placeholder="C-FABC"
              autoCapitalize="characters"
            />
            <FormField
              label={t('common_name')}
              value={commonName}
              onChangeText={setCommonName}
              placeholder="Cessna"
            />
            <FormField
              label={t('model_name')}
              value={model}
              onChangeText={setModel}
              placeholder="150L"
            />
            <FormField
              label={t('serial_number')}
              value={serialNumber}
              onChangeText={setSerialNumber}
              placeholder="15070001"
            />
          </View>

          {/* SECTION: Category */}
          <SectionHeader title={t('section_category')} />
          <View style={styles.section}>
            <FormField
              label={t('category')}
              value={category}
              onChangeText={setCategory}
              placeholder="Normal"
            />
            <FormField
              label={t('engine_type')}
              value={engineType}
              onChangeText={setEngineType}
              placeholder="1, Piston"
            />
          </View>

          {/* SECTION: Weight & Base */}
          <SectionHeader title={t('section_weight')} />
          <View style={styles.section}>
            <FormField
              label={t('max_weight')}
              value={maxWeight}
              onChangeText={setMaxWeight}
              placeholder="1600 lbs"
            />
            <FormField
              label={t('base_operations')}
              value={baseOperations}
              onChangeText={setBaseOperations}
              placeholder="Joliette - CSG3"
            />
          </View>

          {/* SECTION: Construction */}
          <SectionHeader title={t('section_construction')} />
          <View style={styles.section}>
            <FormField
              label={t('manufacturer')}
              value={manufacturer}
              onChangeText={setManufacturer}
              placeholder="Cessna Aircraft Company"
            />
            <FormField
              label={t('country_manufacture')}
              value={countryManufacture}
              onChangeText={setCountryManufacture}
              placeholder="United States"
            />
            <FormField
              label={t('year_manufacture')}
              value={yearManufacture}
              onChangeText={setYearManufacture}
              placeholder="1973"
              keyboardType="numeric"
            />
          </View>

          {/* SECTION: Hours */}
          <SectionHeader title={t('section_hours')} />
          <View style={styles.section}>
            <FormField
              label={t('airframe_hours')}
              value={airframeHours}
              onChangeText={setAirframeHours}
              placeholder="6344.6"
              keyboardType="numeric"
            />
            <FormField
              label={t('engine_hours')}
              value={engineHours}
              onChangeText={setEngineHours}
              placeholder="1281.8"
              keyboardType="numeric"
            />
            <FormField
              label={t('propeller_hours')}
              value={propellerHours}
              onChangeText={setPropellerHours}
              placeholder="400"
              keyboardType="numeric"
            />
          </View>

          {/* TC-Safe Disclaimer */}
          <View style={styles.disclaimer}>
            <Text style={styles.disclaimerIcon}>⚠️</Text>
            <Text style={styles.disclaimerText}>{t('tc_safe_disclaimer')}</Text>
          </View>

          {/* Save Button */}
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>
              {lang === 'fr' ? 'Enregistrer' : 'Save'}
            </Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primary,
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerBack: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBackText: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: '600',
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600',
  },
  headerRight: {
    width: 40,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: COLORS.textMuted,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  // Photo Section
  photoSection: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  photoContainer: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.blue,
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  photoText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  photoHint: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  photoEditBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  photoEditText: {
    fontSize: 16,
  },
  // Section
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  section: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  fieldContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  fieldLabel: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 6,
  },
  fieldInput: {
    fontSize: 16,
    color: COLORS.textDark,
    paddingVertical: 4,
  },
  fieldHint: {
    fontSize: 12,
    color: COLORS.hint,
    marginTop: 4,
    fontStyle: 'italic',
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    padding: 16,
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  disclaimerIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 13,
    color: '#5D4037',
    lineHeight: 18,
  },
  saveButton: {
    marginHorizontal: 16,
    backgroundColor: COLORS.green,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600',
  },
});
