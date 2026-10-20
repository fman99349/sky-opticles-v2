import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ProductSpecs({ attributes }) {
  if (!attributes || Object.keys(attributes).length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>SPECIFICATIONS</Text>
      <View style={styles.table}>
        {Object.entries(attributes).map(([key, value], index) => (
          <View 
            key={key} 
            style={[
              styles.row, 
              index === Object.keys(attributes).length - 1 && styles.rowLast
            ]}
          >
            <Text style={styles.label}>{key}</Text>
            <Text style={styles.value}>{value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 20,
    marginBottom: 10,
  },
  title: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
    color: '#17283A',
    marginBottom: 10,
  },
  table: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E3DC',
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EBE3',
    gap: 16,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  label: {
    fontSize: 13,
    color: '#7C8792',
    fontWeight: '600',
    flex: 1,
  },
  value: {
    fontSize: 13,
    color: '#17283A',
    fontWeight: '700',
    flex: 1.5,
    textAlign: 'right',
  },
});