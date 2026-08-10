import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { Chip } from '../src/components/Chip';
import { useTheme } from '../src/context/ThemeContext';
import { ApiError, parkingApi } from '../src/lib/api';
import { STATUS_META, TYPE_META } from '../src/lib/geo';
import type { ThemeColors } from '../src/theme/colors';
import type { ParkingSpot, ParkingSuggestion } from '../src/types/parking';

type Tab = 'contributions' | 'suggestions';

interface PendingAction {
    kind: 'spot' | 'suggestion';
    id: string;
    action: 'APPROVE' | 'REJECT';
}

/** Resumo legível do diff de uma sugestão (campos alterados). */
function summarizeSuggestion(data: Record<string, unknown>): string[] {
    const parts: string[] = [];
    if (typeof data.name === 'string') parts.push(`Nome: ${data.name}`);
    if (data.description !== undefined) parts.push('Descrição alterada');
    if (typeof data.parkingType === 'string') parts.push(`Tipo: ${TYPE_META[data.parkingType as keyof typeof TYPE_META]?.label ?? data.parkingType}`);
    if (data.capacityRange) parts.push(`Lotação: ${data.capacityRange}`);
    if (data.isFree !== undefined) parts.push(data.isFree ? 'Gratuito' : 'Pago');
    if (data.hasPregnantSpaces === true) parts.push('Lugares grávidas');
    if (data.hasDisabledSpaces === true) parts.push('Mobilidade reduzida');
    if (data.hasEvCharging === true) parts.push('Carregamento elétrico');
    if (data.isCovered === true) parts.push('Coberto');
    return parts;
}

export default function AdminScreen() {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const [tab, setTab] = useState<Tab>('contributions');
    const [queue, setQueue] = useState<ParkingSpot[]>([]);
    const [suggestions, setSuggestions] = useState<ParkingSuggestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
    const [reason, setReason] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [q, s] = await Promise.all([
                parkingApi.moderationQueue(1, 50),
                parkingApi.listSuggestions('PENDING', 1, 50),
            ]);
            setQueue(q);
            setSuggestions(s);
        } catch (error) {
            Alert.alert('Erro', error instanceof ApiError ? error.message : 'Não foi possível carregar a fila.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const decide = async () => {
        if (!pendingAction) return;
        setBusy(true);
        try {
            if (pendingAction.kind === 'spot') {
                await parkingApi.moderate(pendingAction.id, pendingAction.action, reason.trim() || undefined);
            } else {
                await parkingApi.decideSuggestion(pendingAction.id, pendingAction.action, reason.trim() || undefined);
            }
            setReason('');
            setPendingAction(null);
            await load();
        } catch (error) {
            Alert.alert('Erro', error instanceof ApiError ? error.message : 'Não foi possível decidir.');
        } finally {
            setBusy(false);
        }
    };

    const statusColor = (status: ParkingSpot['status']) => colors[STATUS_META[status].colorKey];

    /** Suspende a conta do autor da contribuição (bloqueia login e ações). */
    const confirmBan = (userId: string) => {
        Alert.alert(
            'Suspender autor?',
            'O utilizador deixa de poder entrar, contribuir ou votar. Podes reativar mais tarde pela API.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Suspender',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await parkingApi.setUserActive(userId, false);
                            Alert.alert('Conta suspensa', 'O autor já não pode usar a conta.');
                        } catch (error) {
                            Alert.alert(
                                'Erro',
                                error instanceof ApiError ? error.message : 'Não foi possível suspender.'
                            );
                        }
                    },
                },
            ]
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.tabs}>
                <Chip label={`Contribuições (${queue.length})`} selected={tab === 'contributions'} onPress={() => setTab('contributions')} />
                <Chip label={`Sugestões (${suggestions.length})`} selected={tab === 'suggestions'} onPress={() => setTab('suggestions')} />
            </View>

            <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                {loading ? (
                    <ActivityIndicator color={colors.primary} style={styles.spinner} />
                ) : tab === 'contributions' ? (
                    queue.length === 0 ? (
                        <Text style={styles.empty}>Fila de moderação vazia ✨</Text>
                    ) : (
                        queue.map((spot) => (
                            <View key={spot.id} style={styles.card}>
                                <View style={styles.cardHeader}>
                                    <Text style={styles.cardTitle} numberOfLines={1}>{spot.name}</Text>
                                    <Text style={[styles.status, { color: statusColor(spot.status) }]}>
                                        {STATUS_META[spot.status].label}
                                    </Text>
                                </View>
                                <Text style={styles.cardMeta}>
                                    Confiança {spot.trustScore.toFixed(1)}/10 · {TYPE_META[spot.parkingType].label} ·{' '}
                                    {spot.source}
                                </Text>
                                <View style={styles.cardActions}>
                                    <Pressable style={styles.viewButton} onPress={() => router.push(`/parking/${spot.id}`)}>
                                        <Ionicons name="eye-outline" size={16} color={colors.primary} />
                                        <Text style={styles.viewText}>Ver</Text>
                                    </Pressable>
                                    <Pressable
                                        style={styles.approveButton}
                                        onPress={() => setPendingAction({ kind: 'spot', id: spot.id, action: 'APPROVE' })}
                                        disabled={busy}
                                    >
                                        <Text style={styles.approveText}>Aprovar</Text>
                                    </Pressable>
                                    <Pressable
                                        style={styles.rejectButton}
                                        onPress={() => setPendingAction({ kind: 'spot', id: spot.id, action: 'REJECT' })}
                                        disabled={busy}
                                    >
                                        <Text style={styles.rejectText}>Rejeitar</Text>
                                    </Pressable>
                                </View>
                                {spot.contributorId && (
                                    <Pressable
                                        style={styles.banRow}
                                        onPress={() => confirmBan(spot.contributorId!)}
                                        disabled={busy}
                                        accessibilityRole="button"
                                        accessibilityLabel="Suspender o autor desta contribuição"
                                    >
                                        <Ionicons name="hand-left-outline" size={14} color={colors.danger} />
                                        <Text style={styles.banText}>Suspender autor</Text>
                                    </Pressable>
                                )}
                            </View>
                        ))
                    )
                ) : suggestions.length === 0 ? (
                    <Text style={styles.empty}>Sem sugestões pendentes ✨</Text>
                ) : (
                    suggestions.map((suggestion) => {
                        const summary = summarizeSuggestion(suggestion.data as Record<string, unknown>);
                        return (
                            <View key={suggestion.id} style={styles.card}>
                                <View style={styles.cardHeader}>
                                    <Text style={styles.cardTitle} numberOfLines={1}>Sugestão #{suggestion.id.slice(0, 8)}</Text>
                                    <Text style={styles.cardMeta}>de {suggestion.suggestedById.slice(0, 8)}</Text>
                                </View>
                                {summary.map((line, index) => (
                                    <Text key={index} style={styles.summaryLine}>• {line}</Text>
                                ))}
                                {suggestion.reason ? (
                                    <Text style={styles.reasonText}>Motivo: {suggestion.reason}</Text>
                                ) : null}
                                <View style={styles.cardActions}>
                                    <Pressable
                                        style={styles.viewButton}
                                        onPress={() => router.push(`/parking/${suggestion.parkingSpotId}`)}
                                    >
                                        <Ionicons name="eye-outline" size={16} color={colors.primary} />
                                        <Text style={styles.viewText}>Ver parque</Text>
                                    </Pressable>
                                    <Pressable
                                        style={styles.approveButton}
                                        onPress={() => setPendingAction({ kind: 'suggestion', id: suggestion.id, action: 'APPROVE' })}
                                        disabled={busy}
                                    >
                                        <Text style={styles.approveText}>Aceitar</Text>
                                    </Pressable>
                                    <Pressable
                                        style={styles.rejectButton}
                                        onPress={() => setPendingAction({ kind: 'suggestion', id: suggestion.id, action: 'REJECT' })}
                                        disabled={busy}
                                    >
                                        <Text style={styles.rejectText}>Recusar</Text>
                                    </Pressable>
                                </View>
                            </View>
                        );
                    })
                )}
            </ScrollView>

            {/* Modal de decisão */}
            <Modal visible={pendingAction !== null} transparent animationType="slide">
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>
                            {pendingAction?.action === 'APPROVE' ? 'Aprovar' : 'Rejeitar'}{' '}
                            {pendingAction?.kind === 'spot' ? 'contribuição' : 'sugestão'}
                        </Text>
                        <Text style={styles.modalHint}>
                            {pendingAction?.action === 'APPROVE'
                                ? 'Motivo (opcional):'
                                : 'Motivo (recomendado — o autor recebe-o na notificação):'}
                        </Text>
                        <TextInput
                            style={styles.modalInput}
                            value={reason}
                            onChangeText={setReason}
                            placeholder="Ex.: verificado no local"
                            placeholderTextColor={colors.textMuted}
                            maxLength={500}
                            multiline
                        />
                        <View style={styles.modalActions}>
                            <Pressable style={styles.modalCancel} onPress={() => { setPendingAction(null); setReason(''); }}>
                                <Text style={styles.modalCancelText}>Cancelar</Text>
                            </Pressable>
                            <Pressable
                                style={[
                                    pendingAction?.action === 'APPROVE' ? styles.modalApprove : styles.modalReject,
                                    busy && styles.disabled,
                                ]}
                                onPress={decide}
                                disabled={busy}
                            >
                                <Text style={styles.modalApproveText}>
                                    {pendingAction?.action === 'APPROVE' ? 'Confirmar aprovação' : 'Confirmar rejeição'}
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const createStyles = (colors: ThemeColors) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        tabs: {
            flexDirection: 'row',
            gap: 8,
            padding: 16,
            paddingBottom: 0,
        },
        content: {
            padding: 16,
            gap: 10,
            paddingBottom: 40,
        },
        spinner: {
            marginTop: 40,
        },
        empty: {
            textAlign: 'center',
            color: colors.textMuted,
            marginTop: 40,
        },
        card: {
            backgroundColor: colors.card,
            borderRadius: 16,
            padding: 14,
            borderWidth: 1,
            borderColor: colors.border,
            gap: 8,
        },
        cardHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
        },
        cardTitle: {
            flex: 1,
            fontSize: 15,
            fontWeight: '700',
            color: colors.text,
        },
        cardMeta: {
            fontSize: 12,
            color: colors.textMuted,
        },
        status: {
            fontSize: 12,
            fontWeight: '700',
        },
        summaryLine: {
            fontSize: 13,
            color: colors.text,
        },
        reasonText: {
            fontSize: 12,
            color: colors.textMuted,
            fontStyle: 'italic',
        },
        cardActions: {
            flexDirection: 'row',
            gap: 8,
            marginTop: 2,
        },
        viewButton: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: 10,
            paddingVertical: 7,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: colors.border,
        },
        viewText: {
            color: colors.primary,
            fontSize: 12,
            fontWeight: '600',
        },
        approveButton: {
            flex: 1,
            alignItems: 'center',
            paddingVertical: 7,
            borderRadius: 8,
            backgroundColor: colors.success + '1A',
        },
        approveText: {
            color: colors.success,
            fontSize: 12,
            fontWeight: '700',
        },
        rejectButton: {
            flex: 1,
            alignItems: 'center',
            paddingVertical: 7,
            borderRadius: 8,
            backgroundColor: colors.danger + '1A',
        },
        rejectText: {
            color: colors.danger,
            fontSize: 12,
            fontWeight: '700',
        },
        banRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
            paddingVertical: 4,
        },
        banText: {
            color: colors.danger,
            fontSize: 12,
            fontWeight: '600',
            textDecorationLine: 'underline',
        },
        modalBackdrop: {
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.4)',
            justifyContent: 'flex-end',
        },
        modalCard: {
            backgroundColor: colors.card,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 20,
            gap: 12,
            paddingBottom: 32,
        },
        modalTitle: {
            fontSize: 16,
            fontWeight: '700',
            color: colors.text,
        },
        modalHint: {
            fontSize: 13,
            color: colors.textMuted,
        },
        modalInput: {
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 12,
            padding: 12,
            minHeight: 70,
            textAlignVertical: 'top',
            color: colors.text,
        },
        modalActions: {
            flexDirection: 'row',
            justifyContent: 'flex-end',
            gap: 10,
        },
        modalCancel: {
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 12,
        },
        modalCancelText: {
            color: colors.textMuted,
            fontWeight: '600',
        },
        modalApprove: {
            backgroundColor: colors.success,
            paddingVertical: 12,
            paddingHorizontal: 20,
            borderRadius: 12,
        },
        modalApproveText: {
            color: colors.white,
            fontWeight: '700',
        },
        modalReject: {
            backgroundColor: colors.danger,
            paddingVertical: 12,
            paddingHorizontal: 20,
            borderRadius: 12,
        },
        modalRejectText: {
            color: colors.white,
            fontWeight: '700',
        },
        disabled: {
            opacity: 0.5,
        },
    });
