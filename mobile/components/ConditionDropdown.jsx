import React, { useState } from 'react';
import { Modal, Pressable, Text, View, StyleSheet } from 'react-native';

export default function ConditionDropdown({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);

  const options = [
    { id: 'all', label: 'All Items' },
    { id: 'new', label: 'Brand New' },
    { id: 'used', label: 'Used' },
  ];

  const selected = options.find((o) => o.id === value) || options[0];

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => setIsOpen(true)}
        style={({ pressed }) => [
          styles.trigger,
          pressed && { opacity: 0.7 },
        ]}
      >
        <Text style={styles.triggerText}>
          Condition: <Text style={styles.triggerValue}>{selected.label}</Text> ▼
        </Text>
      </Pressable>

      <Modal visible={isOpen} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setIsOpen(false)}>
          <View style={styles.menu}>
            {options.map((opt) => (
              <Pressable
                key={opt.id}
                onPress={() => {
                  onChange(opt.id);
                  setIsOpen(false);
                }}
                style={[
                  styles.option,
                  value === opt.id && styles.optionActive,
                ]}
              >
                <Text
                  style={[
                    styles.optionText,
                    value === opt.id && styles.optionTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-end', // Align to the right
    paddingHorizontal: 18,
    paddingBottom: 0,
    marginTop: -4, // Pull it up slightly
  },
  trigger: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  triggerText: {
    fontSize: 11,
    color: '#7C8792',
    fontWeight: '600',
  },
  triggerValue: {
    color: '#2E8D86', // Teal accent
    fontWeight: '800',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menu: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    width: 200,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  option: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  optionActive: {
    backgroundColor: '#F1F9F8',
  },
  optionText: {
    fontSize: 14,
    color: '#17283A',
    fontWeight: '500',
  },
  optionTextActive: {
    fontWeight: '800',
    color: '#2E8D86',
  },
});