import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, Button, Alert } from 'react-native';
import { supabase } from '@/services/supabase';
import { CustomNotice } from '@/components/ui/CustomNotice';
import { SafeAreaView } from 'react-native-safe-area-context';

type FormField = { name: string; label: string; type: 'text' | 'date' };

export const PortalSection = ({
  title,
  table,
  uploadEnabled = false,
  onUpload,
  formFields = [],
}: {
  title: string;
  table: string;
  uploadEnabled?: boolean;
  onUpload?: () => void;
  formFields?: FormField[];
}) => {
  const [items, setItems] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const fetchData = async () => {
    const { data, error } = await supabase.from(table).select('*');
    if (error) console.error(error);
    else setItems(data ?? []);
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabase.from(table).select('*');
      if (error) console.error(error);
      else if (mounted) setItems(data ?? []);
    })();
    return () => {
      mounted = false;
    };
  }, [table]);

  const handleDelete = async (id: any) => {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) setNotice('Delete failed.');
    else {
      setNotice('Deleted.');
      fetchData();
    }
  };

  const handleSave = async () => {
    if (!editing) return;
    const { error } = await supabase.from(table).upsert(editing);
    if (error) setNotice('Save failed.');
    else {
      setNotice('Saved.');
      setEditing(null);
      fetchData();
    }
  };

  return (
    <SafeAreaView>
      <Text className="text-xl font-bold mb-4">{title}</Text>

      {uploadEnabled && onUpload && (
        <TouchableOpacity className="mb-4 p-2 bg-primary rounded" onPress={onUpload}>
          <Text className="text-white text-center">Upload PNG / PDF</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={items}
        keyExtractor={item => (item.id ? item.id.toString() : Math.random().toString())}
        renderItem={({ item }) => (
          <View className="flex-row justify-between p-2 border-b border-gray-200">
            <Text>{JSON.stringify(item)}</Text>
            <View className="flex-row space-x-2">
              <Button title="Edit" onPress={() => setEditing(item)} />
              <Button title="Del" color="red" onPress={() => handleDelete(item.id)} />
            </View>
          </View>
        )}
      />

      {editing && (
        <View className="p-4 border-t border-gray-300">
          {formFields.map(f => (
            <View key={f.name} className="mb-2">
              <Text>{f.label}</Text>
              <TextInput
                className="border p-1"
                value={editing[f.name]?.toString() ?? ''}
                onChangeText={t => setEditing({ ...editing, [f.name]: t })}
                placeholder={f.label}
              />
            </View>
          ))}
          <Button title="Save" onPress={handleSave} />
          <Button title="Cancel" color="gray" onPress={() => setEditing(null)} />
        </View>
      )}

      {notice && <CustomNotice message={notice} onDismiss={() => setNotice(null)} />}
    </SafeAreaView>
  );
};
