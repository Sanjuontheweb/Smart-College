import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppTheme } from '@/context/ThemeContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { RetroLogo } from '@/components/common/RetroLogo';

export default function ModalScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <RetroLogo size="large" showSubtitle={false} />
        <Text style={[styles.title, { color: colors.text, marginTop: 12 }]}>Survive College</Text>
        <Text style={[styles.version, { color: colors.textSecondary }]}>
          Version 1.0.0 • Fully Local Android Edition
        </Text>
      </View>

      <Card style={{ backgroundColor: colors.card, borderColor: colors.cardBorder, marginBottom: 14 }}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Architecture & Tech Stack</Text>
        <Text style={[styles.cardText, { color: colors.textSecondary }]}>
          • Framework: React Native with Expo SDK 58 & TypeScript{'\n'}
          • Local Database: 100% on-device Android offline database & document vault{'\n'}
          • AI Assistant: Live Hugging Face Open-Source Models (Llama 3.2, Qwen 2.5, Mistral 7B, Phi 3.5){'\n'}
          • Document Analysis: OCR & syllabus extraction for PNG/PDF timetable & calendar uploads{'\n'}
          • Push Notifications: Local push reminders 4-5d before CIE, 10d before SEE, 1d before assignments{'\n'}
          • Role Switching: Dedicated Roles tab with zero-password instant switching
        </Text>
      </Card>

      <Card style={{ backgroundColor: colors.card, borderColor: colors.cardBorder, marginBottom: 20 }}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>How to Run on Android</Text>
        <Text style={[styles.cardText, { color: colors.textSecondary }]}>
          1. Install Expo Go from Google Play Store on your Android phone.{'\n'}
          2. Run &lsquo;npx expo start&rsquo; on your PC.{'\n'}
          3. Scan the QR code with Expo Go.{'\n'}
          4. Switch roles anytime using the dedicated Roles tab at the bottom!
        </Text>
      </Card>

      <Button title="Close" variant="primary" onPress={() => router.back()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
  },
  version: {
    fontSize: 12,
    marginTop: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 8,
  },
  cardText: {
    fontSize: 13,
    lineHeight: 20,
  },
});
