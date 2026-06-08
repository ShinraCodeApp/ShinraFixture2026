import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { createWebSocketConnection } from '../../services/api';

const REACTIONS = ['⚽', '👏', '😱', '❤️', '🔥', '😤'];

interface FloatingItem { id: number; emoji: string; x: number }

function FloatingEmoji({ item, onDone }: { item: FloatingItem; onDone: (id: number) => void }) {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 200 }),
      Animated.timing(translateY, { toValue: -130, duration: 1800, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(1000),
        Animated.timing(opacity, { toValue: 0, duration: 800, useNativeDriver: true }),
      ]),
    ]).start(() => onDone(item.id));
  }, []);

  return (
    <Animated.Text
      style={[
        styles.floater,
        { left: item.x, transform: [{ translateY }, { scale }], opacity },
      ]}
    >
      {item.emoji}
    </Animated.Text>
  );
}

export function WatchPartyBar({ matchId }: { matchId: string }) {
  const [viewers, setViewers] = useState(1);
  const [floaters, setFloaters] = useState<FloatingItem[]>([]);
  const socketRef = useRef<any>(null);
  const nextId = useRef(0);

  useEffect(() => {
    const socket = createWebSocketConnection(matchId);
    socketRef.current = socket;
    socket.emit('join-match', matchId);

    socket.on('match:viewers', ({ count }: { count: number }) => setViewers(count));
    socket.on('match:reaction', ({ emoji }: { emoji: string }) => addFloater(emoji));

    return () => {
      socket.emit('leave-match', matchId);
      socket.disconnect();
    };
  }, [matchId]);

  const addFloater = useCallback((emoji: string) => {
    const id = nextId.current++;
    const x = Math.random() * 220 + 20;
    setFloaters((prev) => [...prev.slice(-8), { id, emoji, x }]);
  }, []);

  const sendReaction = useCallback((emoji: string) => {
    socketRef.current?.emit('watch:reaction', { matchId, emoji });
    addFloater(emoji);
  }, [matchId, addFloater]);

  const removeFloater = useCallback((id: number) => {
    setFloaters((prev) => prev.filter((f) => f.id !== id));
  }, []);

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Floating emojis */}
      {floaters.map((f) => (
        <FloatingEmoji key={f.id} item={f} onDone={removeFloater} />
      ))}

      {/* Bar */}
      <View style={styles.bar}>
        <View style={styles.viewers}>
          <Text style={styles.eyeText}>👁</Text>
          <Text style={styles.viewerCount}>{viewers}</Text>
        </View>
        <View style={styles.reactionRow}>
          {REACTIONS.map((emoji) => (
            <TouchableOpacity
              key={emoji}
              onPress={() => sendReaction(emoji)}
              style={styles.reactionBtn}
            >
              <Text style={styles.reactionEmoji}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  floater: {
    position: 'absolute',
    bottom: 56,
    fontSize: 28,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.92)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  viewers: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  eyeText: { fontSize: 12 },
  viewerCount: { color: 'white', fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  reactionRow: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  reactionBtn: {
    padding: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  reactionEmoji: { fontSize: 22 },
});
