import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { lensWizardStyles as w } from '../screens/lensWizardStyles';

// Reusable education popup, used by the Lens Wizard to explain
// "What is lens index?" etc. Matches the Lensmart pattern: a small modal
// with a title, a body, and a close button.
//
// Uses Ionicons from @expo/vector-icons — the same icon family the rest of
// the wizard uses. Do NOT import individual icon names from this package;
// it exports families, not single icons.
export default function InfoPopup({ visible, title, body, onClose }) {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={w.popupBackdrop} onPress={onClose}>
        <Pressable style={w.popupCard} onPress={() => {}}>
          <View style={w.popupHead}>
            <Text style={w.popupTitle}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={20} color="#7C8792" />
            </Pressable>
          </View>

          <ScrollView>
            <Text style={w.popupBody}>{body}</Text>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}