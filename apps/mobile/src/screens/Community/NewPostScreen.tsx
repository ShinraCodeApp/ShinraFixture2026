import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/api';
import { useAppTheme } from '../../hooks/useAppTheme';
import { colors, spacing, typography, borderRadius } from '../../theme';

const CATEGORIES = ['General', 'Grupos', 'Favoritos', 'Predicciones', 'Noticias'];

export function NewPostScreen() {
  const navigation = useNavigation<any>();
  const { appColors } = useAppTheme();
  const qc = useQueryClient();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('General');

  const mutation = useMutation({
    mutationFn: () => apiService.post('/community/forum', { title: title.trim(), content: content.trim(), category }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['forum'] });
      navigation.goBack();
    },
    onError: (e: any) => Alert.alert('Error', e?.response?.data?.message ?? 'No se pudo publicar'),
  });

  const canSubmit = title.trim().length >= 3 && content.trim().length >= 10 && !mutation.isPending;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appColors.background }]} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: appColors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={24} color={appColors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: appColors.text }]}>Nueva publicación</Text>
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: canSubmit ? colors.primary : appColors.border }]}
            onPress={() => mutation.mutate()}
            disabled={!canSubmit}
          >
            {mutation.isPending
              ? <ActivityIndicator color="white" size="small" />
              : <Text style={styles.submitText}>Publicar</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Category */}
          <Text style={[styles.label, { color: appColors.textSecondary }]}>CATEGORÍA</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
            {CATEGORIES.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.catPill, { borderColor: category === c ? colors.primary : appColors.border, backgroundColor: category === c ? colors.primary + '15' : 'transparent' }]}
                onPress={() => setCategory(c)}
              >
                <Text style={[styles.catText, { color: category === c ? colors.primary : appColors.textSecondary }]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Title */}
          <Text style={[styles.label, { color: appColors.textSecondary }]}>TÍTULO</Text>
          <TextInput
            style={[styles.titleInput, { backgroundColor: appColors.surface, color: appColors.text, borderColor: appColors.border }]}
            placeholder="Escribe un título claro y descriptivo..."
            placeholderTextColor={appColors.textSecondary}
            value={title}
            onChangeText={setTitle}
            maxLength={120}
            multiline={false}
          />
          <Text style={[styles.charCount, { color: appColors.textSecondary }]}>{title.length}/120</Text>

          {/* Content */}
          <Text style={[styles.label, { color: appColors.textSecondary }]}>CONTENIDO</Text>
          <TextInput
            style={[styles.contentInput, { backgroundColor: appColors.surface, color: appColors.text, borderColor: appColors.border }]}
            placeholder="¿Qué querés compartir con la comunidad?"
            placeholderTextColor={appColors.textSecondary}
            value={content}
            onChangeText={setContent}
            maxLength={2000}
            multiline
            textAlignVertical="top"
          />
          <Text style={[styles.charCount, { color: appColors.textSecondary }]}>{content.length}/2000</Text>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.base, paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.bold },
  submitBtn: {
    paddingHorizontal: spacing.base, paddingVertical: spacing.xs,
    borderRadius: borderRadius.full, minWidth: 72, alignItems: 'center',
  },
  submitText: { color: 'white', fontFamily: typography.fontFamily.bold, fontSize: typography.fontSize.sm },
  label: {
    fontSize: 11, fontFamily: typography.fontFamily.bold, letterSpacing: 0.8,
    marginHorizontal: spacing.base, marginTop: spacing.base, marginBottom: spacing.xs,
  },
  catRow: { paddingHorizontal: spacing.base, gap: spacing.xs, paddingVertical: spacing.xs },
  catPill: {
    paddingHorizontal: spacing.base, paddingVertical: spacing.xs,
    borderRadius: borderRadius.full, borderWidth: 1,
  },
  catText: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.medium },
  titleInput: {
    marginHorizontal: spacing.base, padding: spacing.base,
    borderRadius: borderRadius.lg, borderWidth: 1,
    fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.medium,
  },
  contentInput: {
    marginHorizontal: spacing.base, padding: spacing.base,
    borderRadius: borderRadius.lg, borderWidth: 1,
    fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.regular,
    minHeight: 180,
  },
  charCount: { fontSize: typography.fontSize.xs, textAlign: 'right', marginHorizontal: spacing.base, marginTop: 4 },
});
