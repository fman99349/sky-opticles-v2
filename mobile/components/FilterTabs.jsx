import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { styles } from '../styles';

export default function FilterTabs({ 
  parentTabs, 
  childTabs, 
  activeParentId, 
  activeChildId, 
  onParentChange, 
  onChildChange 
}) {
  return (
    <View>
      {/* PARENT TABS (Larger) */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
          {parentTabs.map((tab) => {
            const active = tab.id === activeParentId;
            return (
              <Pressable
                key={tab.id}
                onPress={() => onParentChange(tab.id)}
                style={({ pressed }) => [
                  styles.filterTab, // Default size
                  active && styles.filterTabActive,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={[styles.filterTabText, active && styles.filterTabTextActive]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* CHILD TABS (Smaller) */}
      {childTabs && childTabs.length > 1 && (
        <View style={styles.subFilterBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
            {childTabs.map((tab) => {
              const active = tab.id === activeChildId;
              return (
                <Pressable
                  key={tab.id}
                  onPress={() => onChildChange(tab.id)}
                  style={({ pressed }) => [
                    styles.subFilterTab,
                    active && styles.subFilterTabActive,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Text style={[styles.subFilterTabText, active && styles.subFilterTabTextActive]}>
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
}