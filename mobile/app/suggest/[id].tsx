import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View,
} from 'react-native';
import { Chip } from '../../src/components/Chip';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { ApiError, parkingApi, type SuggestInput } from '../../src/lib/api';
import { CAPACITY_LABELS, TYPE_META } from '../../src/lib/geo';
import type { ThemeColors } from '../../src/theme/colors';
import type { CapacityRange, ParkingSpot, ParkingType } from '../../src/types/parking';

const TYPE_OPTIONS: ParkingType[] = ['SURFACE', 'UNDERGROUND', 'MULTI_STORY', 'STREET', 'OTHER'];
const CAPACITY_OPTIONS: CapacityRange[] = [
    'RANGE_1_5',
    'RANGE_6_20',
    'RANGE_21_50',
    'RANGE_51_100',
    'RANGE_100_PLUS',
];

const DETAIL_FIELDS: {
    key: 'hasPregnantSpaces' | 'hasDisabledSpaces' | 'hasEvCharging' | 'isCovered';
    label: string;
}[] = [
    { key: 'hasPregnantSpaces', label: 'Lugares para grávidas' },
    { key: 'hasDisabledSpaces', label: 'Mobilidade reduzida' },
    { key: 'hasEvCharging', label: 'Carregamento elétrico' },
    { key: 'isCovered', label: 'Coberto' },
];

/** Preenche um campo de texto a partir do valor atual (null → ''). */
function text(value: string | null | undefined): string {
    return value ?? '';
}

/** null, false e '' não fazem parte do diff. */
function includeField(value: unknown): boolean {
    return value !== null && value !== undefined && value !== false && value !== '';
}

export default function SuggestScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuth();
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const [spot, setSpot] = useState<ParkingSpot | null>(null);
    const [loading, setLoading] = useState(true);

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [parkingType, setParkingType] = useState<ParkingType>('SURFACE');
    const [capacityRange, setCapacityRange] = useState<CapacityRange | null>(null);
    const [isFree, setIsFree] = useState(false);
    const [details, setDetails] = useState({
        hasPregnantSpaces: false,
        hasDisabledSpaces: false,
        hasEvCharging: false,
        isCovered: false,
    });
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!loading && !user) {
            router.replace('/login');
        }
    }, [user, loading]);

    const load = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const spot = await parkingApi.get(id);
            setSpot(spot);
            setName(spot.name);
            setDescription(text(spot.description));
            setParkingType(spot.parkingType);
            setCapacityRange(spot.capacityRange);
            setIsFree(spot.isFree ?? false);
            setDetails({
                hasPregnantSpaces: spot.hasPregnantSpaces ?? false,
                hasDisabledSpaces: spot.hasDisabledSpaces ?? false,
                hasEvCharging: spot.hasEvCharging ?? false,
                isCovered: spot.isCovered ?? false,
            });
        } catch (error) {
            Alert.alert('Erro', 'Não foi possível carregar o estacionamento.');
            router.back();
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        load();
    }, [load]);

    const buildDiff = (): SuggestInput => {
        const diff: SuggestInput = {};
        if (!spot) return diff;
        if (name.trim() !== spot.name) diff.name = name.trim();
        const newDescription = description.trim() || null;
        if (newDescription !== spot.description) diff.description = newDescription;
        if (parkingType !== spot.parkingType) diff.parkingType = parkingType;
        if (capacityRange !== spot.capacityRange) diff.capacityRange = capacityRange;
        if (isFree !== (spot.isFree ?? false)) diff.isFree = isFree;
        for (const field of DETAIL_FIELDS) {
            const current = spot[field.key] ?? false;
            if (details[field.key] !== current) {
                diff[field.key] = details[field.key];
            }
        }
        if (reason.trim()) diff.reason = reason.trim();
        return diff;
    };

    const submit = async () => {
        if (!spot) return;
        const diff = buildDiff();
        if (Object.keys(diff).filter((key) => key !== 'reason').length === 0) {
            Alert.alert('Sem alterações', 'Altera pelo menos um campo antes de enviar.');
            return;
        }

        setSubmitting(true);
        try {
            const result = await parkingApi.suggest(spot.id, diff);
            if (result.applied) {
                Alert.alert(
                    'Alteração aplicada',
                    'A tua alteração foi aplicada. O estacionamento volta a ser verificado pela comunidade.',
                    [{ text: 'OK', onPress: () => router.replace(`/parking/${spot.id}`) }]
                );
            } else {
                Alert.alert(
                    'Sugestão enviada',
                    'A tua sugestão entrou na fila de revisão. Obrigado por melhorares o parqi!',
                    [{ text: 'OK', onPress: () => router.back() }]
                );
            }
        } catch (error) {
            Alert.alert(
                'Erro',
                error instanceof ApiError ? error.message : 'Não foi possível enviar a sugestão.'
            );
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!spot) {
        return (
            <View style={styles.center}>
                <Text style={styles.notFound}>Estacionamento não encontrado.</Text>
                <Pressable onPress={() => router.back()}>
                    <Text style={styles.notFoundLink}>Voltar</Text>
                </Pressable>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                <Text style={styles.intro}>
                    Complementa a informação de «{spot.name}». Só os campos alterados são enviados.
                </Text>

                <Text style={styles.label}>Nome</Text>
                <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Nome do estacionamento"
                    placeholderTextColor={colors.textMuted}
                    maxLength={120}
                />

                <Text style={styles.label}>Tipo</Text>
                <View style={styles.chipRow}>
                    {TYPE_OPTIONS.map((type) => (
                        <Chip
                            key={type}
                            label={TYPE_META[type].label}
                            selected={parkingType === type}
                            onPress={() => setParkingType(type)}
                        />
                    ))}
                </View>

                <Text style={styles.label}>Lotação (opcional)</Text>
                <View style={styles.chipRow}>
                    {CAPACITY_OPTIONS.map((range) => (
                        <Chip
                            key={range}
                            label={CAPACITY_LABELS[range]}
                            selected={capacityRange === range}
                            onPress={() => setCapacityRange(capacityRange === range ? null : range)}
                        />
                    ))}
                </View>

                <View style={styles.switchRow}>
                    <Text style={styles.label}>Gratuito</Text>
                    <Switch value={isFree} onValueChange={setIsFree} trackColor={{ true: colors.primary }} />
                </View>

                <Text style={styles.label}>Detalhes</Text>
                <View style={styles.detailsCard}>
                    {DETAIL_FIELDS.map((field) => (
                        <View key={field.key} style={styles.switchRow}>
                            <Text style={styles.detailLabel}>{field.label}</Text>
                            <Switch
                                value={details[field.key]}
                                onValueChange={(value) => setDetails((current) => ({ ...current, [field.key]: value }))}
                                trackColor={{ true: colors.primary }}
                            />
                        </View>
                    ))}
                </View>

                <Text style={styles.label}>Descrição</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Descrição, horário, acesso…"
                    placeholderTextColor={colors.textMuted}
                    maxLength={2000}
                    multiline
                />

                <Text style={styles.label}>Motivo (opcional, recomendado)</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    value={reason}
                    onChangeText={setReason}
                    placeholder="Ex.: acrescentei que tem carregamento elétrico."
                    placeholderTextColor={colors.textMuted}
                    maxLength={500}
                    multiline
                />

                <Pressable
                    style={[styles.submitButton, submitting && styles.buttonDisabled]}
                    onPress={submit}
                    disabled={submitting}
                >
                    {submitting ? (
                        <ActivityIndicator color={colors.onAccent} />
                    ) : (
                        <>
                            <Ionicons name="send" size={18} color={colors.onAccent} />
                            <Text style={styles.submitText}>Enviar</Text>
                        </>
                    )}
                </Pressable>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const createStyles = (colors: ThemeColors) =>
    StyleSheet.create({
        flex: {
            flex: 1,
            backgroundColor: colors.background,
        },
        container: {
            flex: 1,
        },
        content: {
            padding: 16,
            gap: 8,
            paddingBottom: 40,
        },
        center: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
        },
        notFound: {
            fontSize: 14,
            color: colors.textMuted,
        },
        notFoundLink: {
            marginTop: 10,
            fontSize: 14,
            fontWeight: '600',
            color: colors.primary,
        },
        intro: {
            fontSize: 14,
            color: colors.textMuted,
            lineHeight: 20,
            marginBottom: 4,
        },
        label: {
            fontSize: 13,
            fontWeight: '600',
            color: colors.text,
            marginTop: 10,
        },
        input: {
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 12,
            padding: 12,
            backgroundColor: colors.card,
            color: colors.text,
            marginTop: 4,
        },
        textArea: {
            minHeight: 80,
            textAlignVertical: 'top',
        },
        chipRow: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
            marginTop: 4,
        },
        switchRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 4,
        },
        detailsCard: {
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 16,
            padding: 12,
            marginTop: 4,
            gap: 2,
        },
        detailLabel: {
            fontSize: 14,
            color: colors.text,
        },
        submitButton: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            backgroundColor: colors.accent,
            borderRadius: 14,
            paddingVertical: 14,
            marginTop: 20,
        },
        submitText: {
            color: colors.onAccent,
            fontWeight: '700',
            fontSize: 15,
        },
        buttonDisabled: {
            opacity: 0.6,
        },
    });
