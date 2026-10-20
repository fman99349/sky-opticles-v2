import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import {
  PRESCRIPTION_RANGES,
  emptyPrescription,
  isPrescriptionEmpty,
} from '../data/lensOptions';
import { lensWizardStyles as w } from './lensWizardStyles';
import InfoPopup from '../components/InfoPopup';
import { useAuth } from '../auth/AuthContext';
import { uploadPrescription } from '../utils/api';

// Step 3 of the Lens Wizard — optional prescription entry.
//
// Two ways to give a prescription:
//   1. Type SPH / CYL / Axis / PD per eye (saved in cart memory only)
//   2. Upload a photo or PDF (saved server-side, referenced by uploadId)
//
// Upload requires sign-in. Typed values do not.
// Skipping this step entirely is allowed.

const FIELDS = ['sph', 'cyl', 'axis', 'pd'];
const FIELD_LABELS = { sph: 'SPH', cyl: 'CYL', axis: 'Axis', pd: 'PD' };
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const HELP = {
  title: 'Reading your prescription',
  body:
    'OD = right eye, OS = left eye.\n\n' +
    'SPH (Sphere): your main distance correction. Negative for short-sighted.\n\n' +
    'CYL (Cylinder): amount of astigmatism. Axis (0–180) tells the lens where to apply it.\n\n' +
    'PD (Pupillary Distance): distance between your pupils in mm.\n\n' +
    'You can also upload a photo or PDF of your prescription. ' +
    'Your optician will confirm the final details when preparing your order.',
};

function inRange(field, value) {
  if (value === '' || value === null || value === undefined) return true;
  const n = Number(value);
  if (!Number.isFinite(n)) return false;
  const r = PRESCRIPTION_RANGES[field];
  if (!r) return true;
  return n >= r.min && n <= r.max;
}

function humanBytes(n) {
  if (!Number.isFinite(n) || n <= 0) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function PrescriptionStep({ config, onChange }) {
  const { token } = useAuth();
  const [helpOpen, setHelpOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const rx = config.prescription || emptyPrescription();
  const hasUpload = !!rx.uploadId;

  const updateRx = (nextRx) => {
    onChange({ ...config, prescription: nextRx });
  };

  const updateField = (eye, field, value) => {
    updateRx({
      ...rx,
      [eye]: { ...rx[eye], [field]: value },
    });
  };

  const skip = () => {
    updateRx(emptyPrescription());
  };

  const removeUpload = () => {
    updateRx({
      ...rx,
      uploadId: null,
      uploadedFileName: null,
      uploadedSizeBytes: null,
    });
    setUploadError('');
  };

  const pickFile = async () => {
    setUploadError('');

    if (!token) {
      setUploadError('Please sign in to upload a prescription.');
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/jpeg', 'image/png', 'application/pdf'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];

      if (asset.size && asset.size > MAX_UPLOAD_BYTES) {
        setUploadError('File exceeds the 10 MB limit.');
        return;
      }

      setUploading(true);
      const payload = await uploadPrescription(token, {
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType,
      });

      updateRx({
        ...rx,
        uploadId: payload.data.id,
        uploadedFileName: payload.data.original_name,
        uploadedSizeBytes: payload.data.size_bytes,
      });
    } catch (err) {
      setUploadError(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const isEmpty = isPrescriptionEmpty(rx);

  return (
    <View style={w.scrollBody}>
      <Text style={w.stepTitle}>Your prescription</Text>
      <Text style={w.stepSubtitle}>
        Optional. Type your values below, upload a photo or PDF, or skip.
      </Text>

      <Pressable style={w.stepHelpRow} onPress={() => setHelpOpen(true)}>
        <Ionicons
          name="information-circle-outline"
          size={16}
          color="#17283A"
        />
        <Text style={w.stepHelpText}>How to read your prescription</Text>
      </Pressable>

      <View style={w.rxGrid}>
        <View style={w.rxHeaderRow}>
          <Text style={w.rxHeaderEye}>Eye</Text>
          {FIELDS.map((f) => (
            <Text key={f} style={w.rxHeaderCell}>
              {FIELD_LABELS[f]}
            </Text>
          ))}
        </View>

        {['od', 'os'].map((eye) => (
          <View key={eye} style={w.rxRow}>
            <Text style={w.rxEyeLabel}>
              {eye === 'od' ? 'Right (OD)' : 'Left (OS)'}
            </Text>
            {FIELDS.map((f) => {
              const value = rx[eye]?.[f] ?? '';
              const valid = inRange(f, value);
              return (
                <TextInput
                  key={f}
                  value={String(value)}
                  onChangeText={(t) => updateField(eye, f, t)}
                  keyboardType={
                    f === 'axis' ? 'number-pad' : 'numbers-and-punctuation'
                  }
                  placeholder="—"
                  placeholderTextColor="#B0B7C1"
                  style={[w.rxInput, !valid && w.rxInputError]}
                  maxLength={6}
                />
              );
            })}
          </View>
        ))}

        <Text style={w.rxNote}>
          Values outside standard ranges are highlighted. Final check is done
          by your optician.
        </Text>
      </View>

      <View style={w.uploadBox}>
        {hasUpload ? (
          <>
            <View style={w.uploadStatus}>
              <Ionicons name="checkmark-circle" size={20} color="#2E8D86" />
              <View style={{ flex: 1 }}>
                <Text style={w.uploadStatusText} numberOfLines={1}>
                  {rx.uploadedFileName || 'Prescription uploaded'}
                </Text>
                <Text style={w.uploadStatusSub}>
                  {humanBytes(rx.uploadedSizeBytes)} · Uploaded
                </Text>
              </View>
              <Pressable
                onPress={removeUpload}
                style={w.uploadRemove}
                hitSlop={8}
              >
                <Text style={w.uploadRemoveText}>REMOVE</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <Pressable
              onPress={pickFile}
              disabled={uploading}
              style={({ pressed }) => [
                w.uploadBtn,
                (pressed || uploading) && w.uploadBtnDisabled,
              ]}
            >
              {uploading ? (
                <ActivityIndicator color="#D7B987" />
              ) : (
                <>
                  <Ionicons
                    name="cloud-upload-outline"
                    size={18}
                    color="#D7B987"
                  />
                  <Text style={w.uploadBtnText}>
                    {uploading ? 'UPLOADING…' : 'UPLOAD PRESCRIPTION'}
                  </Text>
                </>
              )}
            </Pressable>

            <Text style={w.uploadHint}>
              JPG, PNG or PDF · up to 10 MB
            </Text>

            {!token && (
              <Text style={w.uploadSignInHint}>
                Sign in to enable file upload.
              </Text>
            )}

            {uploadError ? (
              <Text style={w.uploadError}>{uploadError}</Text>
            ) : null}
          </>
        )}
      </View>

      <Pressable onPress={skip} style={w.rxSkipRow}>
        <Text style={w.rxSkipText}>
          {isEmpty ? 'Skip this step →' : 'Clear and skip →'}
        </Text>
      </Pressable>

      <InfoPopup
        visible={helpOpen}
        title={HELP.title}
        body={HELP.body}
        onClose={() => setHelpOpen(false)}
      />
    </View>
  );
}