import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { CAPACITY_LABELS, STATUS_META, TYPE_META, formatDistance, formatTrust, trustColorKey } from '../lib/geo';
import type { ThemeColors } from '../theme/colors';
import type { ParkingSpot } from '../types/parking';

interface SpotCardProps {
    spot: ParkingSpot;
    onPress: () => void;
    /** Distância ao utilizador, em km (mostrada quando conhecida). */
    distanceKm?: number;
}

export function SpotCard({ spot, onPress, distanceKm }: SpotCardProps) {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const type = TYPE_META[spot.parkingType];
    const status = STATUS_META[spot.status];

    const details = [
        distanceKm !== undefined ? formatDistance(distanceKm) : null,
        type.label,
        spot.capacityRange ? CAPACITY_LABELS[spot.capacityRange] : null,
        spot.isFree === true ? 'Grátis' : spot.isFree === false ? 'Pago' : null,
    ]
        .filter(Boolean)
        .join(' · ');

    return (
        <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
            <View style={[styles.iconWrap, { backgroundColor: type.color + '22' }]}>
                <Ionicons name={type.icon} size={20} color={type.color} />
            </View>

            <View style={styles.info}>
                <Text style={styles.name} numberOfLines={1}>
                    {spot.name}
                </Text>
                <Text style={styles.details} numberOfLines={1}>
                    {details}
                </Text>
            </View>

            <View style={styles.right}>
                <Text style={[styles.trust, { color: colors[trustColorKey(spot.trustScore)] }]}>
                    {formatTrust(spot.trustScore)}
                </Text>
                <Text style={[styles.status, { color: colors[status.colorKey] }]}>{status.label}</Text>
            </View>
        </Pressable>
    );
}

const createStyles = (colors: ThemeColors) =>
    StyleSheet.create({
        card: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.card,
            borderRadius: 14,
            padding: 12,
            gap: 12,
            borderWidth: 1,
            borderColor: colors.border,
        },
        pressed: {
            opacity: 0.85,
        },
        iconWrap: {
            width: 40,
            height: 40,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
        },
        info: {
            flex: 1,
            gap: 2,
        },
        name: {
            fontSize: 15,
            fontWeight: '600',
            color: colors.text,
        },
        details: {
            fontSize: 12,
            color: colors.textMuted,
        },
        right: {
            alignItems: 'flex-end',
            gap: 2,
        },
        trust: {
            fontSize: 13,
            fontWeight: '700',
        },
        status: {
            fontSize: 12,
        },
    });
