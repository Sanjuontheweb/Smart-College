// File: app/(tabs)/admin-console.tsx
import { View, Text, Button, Alert } from 'react-native';
import { supabase } from '@/services/supabase';
import { CustomNotice } from '@/components/ui/CustomNotice';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AdminConsole() {
  const [notice, setNotice] = useState<string | null>(null);

  const handleSemesterReset = async () => {
    const confirm = await new Promise<boolean>(resolve => {
      Alert.alert(
        'Confirm Semester Reset',
        'This will delete all timetable, events, assignments, marks, attendance, etc. Permanent data (students, faculty, clubs) will stay.',
        [
          { text: 'Cancel', onPress: () => resolve(false), style: 'cancel' },
          { text: 'Reset', onPress: () => resolve(true), style: 'destructive' },
        ]
      );
    });
    if (!confirm) return;

    // List of tables to truncate
    const tables = [
      'timetables',
      'events',
      'assignments',
      'marks',
      'attendance',
      'internships',
    ];

    try {
      for (const tbl of tables) {
        await supabase.from(tbl).delete().neq('id', -1); // simple truncate alternative
      }
      setNotice('Semester data reset successfully.');
    } catch (e) {
      console.error(e);
      setNotice('Failed to reset semester data.');
    }
  };

  return (
    <SafeAreaView className="flex-1 p-4 bg-background">
      <Text className="text-2xl font-bold mb-4">Admin Console</Text>

      {/* other admin controls … */}

      <Button title="Semester End – Reset Data" color="#d9534f" onPress={handleSemesterReset} />

      {notice && <CustomNotice message={notice} onDismiss={() => setNotice(null)} />}
    </SafeAreaView>
  );
}