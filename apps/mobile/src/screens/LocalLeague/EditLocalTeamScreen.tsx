import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { apiService } from '../../services/api';
import { useAppTheme } from '../../hooks/useAppTheme';
import { colors, spacing, typography, borderRadius } from '../../theme';

type Position = 'GOALKEEPER' | 'DEFENDER' | 'MIDFIELDER' | 'FORWARD';

const POSITIONS: { key: Position; label: string; short: string; color: string }[] = [
  { key: 'GOALKEEPER', label: 'Arquero', short: 'ARQ', color: '#F59E0B' },
  { key: 'DEFENDER', label: 'Defensor', short: 'DEF', color: '#3B82F6' },
  { key: 'MIDFIELDER', label: 'Mediocampista', short: 'MED', color: '#10B981' },
  { key: 'FORWARD', label: 'Delantero', short: 'DEL', color: '#EF4444' },
];

const TEAM_COLORS = [
  '#0D47A1', '#C62828', '#2E7D32', '#F57F17',
  '#6A1B9A', '#00695C', '#AD1457', '#4527A0',
  '#37474F', '#FF6F00', '#01579B', '#880E4F',
];

const BADGE_EMOJIS = ['⚽', '🏆', '⭐', '🦁', '🐯', '🦅', '🔥', '💪', '🌟', '🎯', '🥇', '🏅'];

interface Player {
  id?: string;
  name: string;
  number: string;
  position: Position | '';
}

export function EditLocalTeamScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { leagueId, team } = route.params;
  const { appColors } = useAppTheme();
  const qc = useQueryClient();

  const isEdit = !!team;
  const [teamName, setTeamName] = useState(team?.name ?? '');
  const [badge, setBadge] = useState(team?.badge ?? '');
  const [color, setColor] = useState(team?.color ?? TEAM_COLORS[0]);
  const [players, setPlayers] = useState<Player[]>(
    team?.players?.map((p: any) => ({ id: p.id, name: p.name, number: p.number?.toString() ?? '', position: p.position ?? '' })) ?? []
  );
  const [showBadgePicker, setShowBadgePicker] = useState(false);

  const addPlayer = () => {
    setPlayers((prev) => [...prev, { name: '', number: '', position: '' }]);
  };

  const removePlayer = (index: number) => {
    setPlayers((prev) => prev.filter((_, i) => i !== index));
  };

  const updatePlayer = (index: number, field: keyof Player, value: string) => {
    setPlayers((prev) => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!teamName.trim()) throw new Error('Nombre requerido');
      const validPlayers = players.filter((p) => p.name.trim());
      if (isEdit) {
        return apiService.put(`/local-leagues/${leagueId}/teams/${team.id}`, {
          name: teamName.trim(), badge, color,
          players: validPlayers.map((p) => ({
            name: p.name.trim(), number: p.number ? Number(p.number) : null, position: p.position || null,
          })),
        });
      } else {
        const res = await apiService.post(`/local-leagues/${leagueId}/teams`, {
          name: teamName.trim(), badge, color,
        });
        const teamId = res.data.data.id;
        if (validPlayers.length > 0) {
          await apiService.put(`/local-leagues/${leagueId}/teams/${teamId}`, {
            name: teamName.trim(), badge, color,
            players: validPlayers.map((p) => ({
              name: p.name.trim(), number: p.number ? Number(p.number) : null, position: p.position || null,
            })),
          });
        }
        return res;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['local-league', leagueId] });
      navigation.goBack();
    },
    onError: (e: any) => Alert.alert('Error', e.message ?? 'No se pudo guardar el equipo'),
  });

  const handleDelete = () => {
    if (!isEdit) return;
    Alert.alert('Eliminar equipo', `¿Eliminás "${team.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive', onPress: async () => {
          await apiService.delete(`/local-leagues/${leagueId}/teams/${team.id}`);
          qc.invalidateQueries({ queryKey: ['local-league', leagueId] });
          navigation.goBack();
        },
      },
    ]);
  };

  const posColor = (pos: Position | '') => POSITIONS.find((p) => p.key === pos)?.color ?? appColors.border;

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={['#001489', '#0D47A1']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isEdit ? 'Editar equipo' : 'Nuevo equipo'}</Text>
          {isEdit && (
            <TouchableOpacity onPress={handleDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
          )}
          {!isEdit && <View style={{ width: 24 }} />}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          {/* Team name */}
          <Text style={styles.label}>NOMBRE DEL EQUIPO</Text>
          <TextInput
            style={[styles.input, { backgroundColor: 'rgba(255,255,255,0.1)', color: 'white', borderColor: 'rgba(255,255,255,0.2)' }]}
            placeholder="Ej: Los Leones, Barrio Norte FC..."
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={teamName}
            onChangeText={setTeamName}
            maxLength={40}
          />

          {/* Badge & Color */}
          <Text style={styles.label}>ESCUDO Y COLOR</Text>
          <View style={styles.badgeColorRow}>
            {/* Badge emoji picker */}
            <TouchableOpacity
              style={[styles.badgeBtn, { borderColor: color }]}
              onPress={() => setShowBadgePicker(!showBadgePicker)}
            >
              <Text style={styles.badgeEmoji}>{badge || '⚽'}</Text>
            </TouchableOpacity>

            {/* Color picker */}
            <View style={styles.colorGrid}>
              {TEAM_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.colorDot, { backgroundColor: c }, color === c && styles.colorDotSelected]}
                  onPress={() => setColor(c)}
                />
              ))}
            </View>
          </View>

          {showBadgePicker && (
            <View style={styles.emojiGrid}>
              {BADGE_EMOJIS.map((e) => (
                <TouchableOpacity
                  key={e}
                  style={[styles.emojiBtn, badge === e && { backgroundColor: 'rgba(255,255,255,0.2)' }]}
                  onPress={() => { setBadge(e); setShowBadgePicker(false); }}
                >
                  <Text style={{ fontSize: 24 }}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Players */}
          <View style={styles.playersHeader}>
            <Text style={styles.label}>JUGADORES ({players.length})</Text>
            <TouchableOpacity onPress={addPlayer} style={styles.addPlayerBtn}>
              <Ionicons name="add" size={16} color={colors.accent} />
              <Text style={[styles.addPlayerText, { color: colors.accent }]}>Agregar</Text>
            </TouchableOpacity>
          </View>

          {players.map((player, index) => (
            <View key={index} style={[styles.playerRow, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
              {/* Number */}
              <TextInput
                style={[styles.numInput, { color: 'white', borderColor: 'rgba(255,255,255,0.2)' }]}
                placeholder="#"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={player.number}
                onChangeText={(v) => updatePlayer(index, 'number', v)}
                keyboardType="number-pad"
                maxLength={2}
              />

              {/* Name */}
              <TextInput
                style={[styles.playerNameInput, { color: 'white', borderColor: 'rgba(255,255,255,0.2)' }]}
                placeholder="Nombre del jugador"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={player.name}
                onChangeText={(v) => updatePlayer(index, 'name', v)}
                maxLength={40}
              />

              {/* Position selector */}
              <TouchableOpacity
                style={[styles.posBtn, { borderColor: posColor(player.position) }]}
                onPress={() => {
                  const opts = POSITIONS.map((p) => p.key);
                  const curr = opts.indexOf(player.position as Position);
                  const next = (curr + 1) % opts.length;
                  updatePlayer(index, 'position', opts[next]);
                }}
              >
                <Text style={[styles.posBtnText, { color: posColor(player.position) }]}>
                  {POSITIONS.find((p) => p.key === player.position)?.short ?? 'POS'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => removePlayer(index)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={20} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>
            </View>
          ))}

          {players.length === 0 && (
            <TouchableOpacity style={styles.addFirstPlayer} onPress={addPlayer}>
              <MaterialCommunityIcons name="account-plus-outline" size={28} color="rgba(255,255,255,0.4)" />
              <Text style={styles.addFirstPlayerText}>Tocá para agregar jugadores</Text>
            </TouchableOpacity>
          )}

          {/* Save button */}
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.primary }, saveMutation.isPending && { opacity: 0.6 }]}
            onPress={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="white" />
                <Text style={styles.saveBtnText}>{isEdit ? 'Guardar cambios' : 'Crear equipo'}</Text>
              </>
            )}
          </TouchableOpacity>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.base, paddingVertical: spacing.md,
  },
  headerTitle: { color: 'white', fontSize: typography.fontSize.lg, fontFamily: typography.fontFamily.bold },
  content: { padding: spacing.base, paddingBottom: 80, gap: spacing.sm },

  label: {
    color: 'rgba(255,255,255,0.5)', fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semiBold, letterSpacing: 0.8,
    marginTop: spacing.base, marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2,
    fontSize: typography.fontSize.base, fontFamily: typography.fontFamily.medium,
  },

  badgeColorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  badgeBtn: {
    width: 56, height: 56, borderRadius: 28, borderWidth: 2.5,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  badgeEmoji: { fontSize: 28 },
  colorGrid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  colorDot: { width: 28, height: 28, borderRadius: 14 },
  colorDotSelected: { borderWidth: 3, borderColor: 'white' },

  emojiGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: borderRadius.lg, padding: spacing.sm,
  },
  emojiBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },

  playersHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addPlayerBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addPlayerText: { fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.semiBold },

  playerRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    borderRadius: borderRadius.md, padding: spacing.sm,
  },
  numInput: {
    width: 36, textAlign: 'center', borderWidth: 1, borderRadius: 6,
    paddingVertical: 6, fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.bold,
    color: 'white',
  },
  playerNameInput: {
    flex: 1, borderWidth: 1, borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 6,
    fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.medium,
  },
  posBtn: {
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 6, borderWidth: 1.5, alignItems: 'center', minWidth: 38,
  },
  posBtnText: { fontSize: 10, fontFamily: typography.fontFamily.bold },

  addFirstPlayer: {
    alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl,
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderStyle: 'dashed',
  },
  addFirstPlayerText: { color: 'rgba(255,255,255,0.4)', fontSize: typography.fontSize.sm },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, paddingVertical: spacing.md, borderRadius: borderRadius.md, marginTop: spacing.lg,
  },
  saveBtnText: { color: 'white', fontFamily: typography.fontFamily.bold, fontSize: typography.fontSize.base },
});
