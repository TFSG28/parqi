import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { AppMap, type AppMapHandle } from '../../src/components/AppMap';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { ApiError, parkingApi } from '../../src/lib/api';
import { AMENITY_DESIGN, MONO, PALETTE, TYPE_DESIGN } from '../../src/theme/design';
import type { ThemeColors } from '../../src/theme/colors';
import type { CapacityRange, ParkingType } from '../../src/types/parking';

type Step = 1 | 2 | 3;

interface LatLng {
    latitude: number;
    longitude: number;
}

const DEFAULT_LOCATION: LatLng = { latitude: 38.7369, longitude: -9.1427 };

const TYPE_OPTIONS: { type: ParkingType; icon: keyof typeof Ionicons.glyphMap }[] = [
    { type: 'SURFACE', icon: 'map-outline' },
    { type: 'UNDERGROUND', icon: 'lock-closed-outline' },
    { type: 'MULTI_STORY', icon: 'layers-outline' },
    { type: 'STREET', icon: 'navigate-outline' },
];

const CAPACITY_OPTIONS: { range: CapacityRange; label: string }[] = [
    { range: 'RANGE_1_5', label: '<5' },
    { range: 'RANGE_6_20', label: '6–20' },
    { range: 'RANGE_21_50', label: '21–50' },
    { range: 'RANGE_51_100', label: '51–100' },
    { range: 'RANGE_100_PLUS', label: '100+' },
];

const NEXT_STEPS = [
    'A comunidade vai confirmar ou reportar a tua submissão',
    'A confiança cresce automaticamente com os votos',
    'Chega a 5.0 de confiança para ficares Verificado',
    'A tua reputação cresce com cada contribuição correta',
];

export default function AddSpotScreen() {
    const { user } = useAuth();
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const mapRef = useRef<AppMapHandle>(null);

    const [step, setStep] = useState<Step>(1);
    const [name, setName] = useState('');
    const [point, setPoint] = useState<LatLng | null>(null);
    const [spotType, setSpotType] = useState<ParkingType | null>(null);
    const [isFree, setIsFree] = useState<boolean | null>(null);
    const [capacity, setCapacity] = useState<CapacityRange | null>(null);
    const [amenities, setAmenities] = useState<Record<string, boolean>>({});
    const [confirmed, setConfirmed] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    // Posição inicial = localização do utilizador (fallback Lisboa)
    useEffect(() => {
        (async () => {
            try {
                const perm = await Location.getForegroundPermissionsAsync();
                const status = perm.status === 'granted'
                    ? 'granted'
                    : (await Location.requestForegroundPermissionsAsync()).status;
                if (status === 'granted') {
                    const loc = await Location.getCurrentPositionAsync({});
                    setPoint({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
                }
            } catch {
                // fica o default
            }
        })();
    }, []);

    const location = point ?? DEFAULT_LOCATION;

    const toggleAmenity = (key: string) => {
        setAmenities((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const reset = () => {
        setSubmitted(false);
        setStep(1);
        setName('');
        setSpotType(null);
        setIsFree(null);
        setCapacity(null);
        setAmenities({});
        setConfirmed(false);
    };

    const canContinue = () => {
        if (step === 1) return name.trim().length >= 3 && point !== null;
        if (step === 2) return spotType !== null && isFree !== null;
        return confirmed;
    };

    const handleContinue = async () => {
        if (step < 3) {
            setStep((s) => (s + 1) as Step);
            return;
        }
        if (!user) {
            router.push('/login');
            return;
        }
        setSubmitting(true);
        try {
            await parkingApi.create({
                name: name.trim(),
                geometry: { type: 'Point', coordinates: [location.longitude, location.latitude] },
                parkingType: spotType!,
                capacityRange: capacity ?? undefined,
                isFree: isFree ?? undefined,
                hasEvCharging: amenities.hasEvCharging ?? false,
                hasDisabledSpaces: amenities.hasDisabledSpaces ?? false,
                hasPregnantSpaces: amenities.hasPregnantSpaces ?? false,
                isCovered: amenities.isCovered ?? false,
            });
            setSubmitted(true);
        } catch (error) {
            if (error instanceof ApiError && error.status === 409 && error.details?.existingId) {
                Alert.alert('Já existe', `${error.message} Ver o existente?`, [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                        text: 'Ver',
                        onPress: () => router.replace(`/parking/${error.details!.existingId as string}`),
                    },
                ]);
            } else {
                Alert.alert(
                    'Erro',
                    error instanceof ApiError ? error.message : 'Não foi possível submeter o estacionamento.'
                );
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <ScrollView style={styles.container} contentContainerStyle={styles.successContent}>
                <View style={styles.successIcon}>
                    <Ionicons name="checkmark-circle" size={36} color={colors.primary} />
                </View>
                <Text style={styles.successTitle}>Estacionamento submetido!</Text>
                <Text style={styles.successSubtitle}>
                    A tua contribuição está em revisão pela comunidade.
                </Text>
                <Text style={styles.successStatus}>
                    ESTADO · <Text style={{ color: PALETTE.amber }}>A AGUARDAR VALIDAÇÃO</Text>
                </Text>
                <View style={styles.nextCard}>
                    <Text style={styles.sectionLabel}>O que acontece a seguir</Text>
                    {NEXT_STEPS.map((s, i) => (
                        <View
                            key={s}
                            style={[styles.nextRow, i < NEXT_STEPS.length - 1 && styles.nextRowBorder]}
                        >
                            <Text style={styles.nextNum}>{String(i + 1).padStart(2, '0')}</Text>
                            <Text style={styles.nextText}>{s}</Text>
                        </View>
                    ))}
                </View>
                <Pressable
                    style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
                    onPress={reset}
                >
                    <Text style={styles.primaryBtnText}>Adicionar outro estacionamento</Text>
                </Pressable>
            </ScrollView>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            {/* Header + progresso */}
            <View style={styles.header}>
                <View style={styles.headerRow}>
                    <Text style={styles.title}>Adicionar estacionamento</Text>
                    <Text style={styles.stepLabel}>Passo {step} de 3</Text>
                </View>
                <View style={styles.progress}>
                    {([1, 2, 3] as Step[]).map((s) => (
                        <View
                            key={s}
                            style={[
                                styles.progressSegment,
                                { backgroundColor: s <= step ? colors.primary : colors.border },
                            ]}
                        />
                    ))}
                </View>
                <Pressable
                    onPress={() => router.push('/contribute')}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Modo avançado: desenhar área ou via no mapa"
                    style={({ pressed }) => pressed && styles.pressed}
                >
                    <Text style={styles.advancedLink}>Modo avançado: desenhar área ou via</Text>
                </Pressable>
            </View>

            <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
                {step === 1 && (
                    <View>
                        <Text style={styles.stepHint}>Onde fica o estacionamento?</Text>
                        <View style={styles.mapCard}>
                            <AppMap
                                ref={mapRef}
                                center={location}
                                zoom={15}
                                markers={[{ id: 'pin', ...location, color: colors.primary }]}
                                brandColor={colors.primary}
                                accentColor={colors.accent}
                                onMapPress={(coord) => setPoint(coord)}
                                style={styles.map}
                            />
                            <View style={styles.mapFooter}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Nome (ex.: Parque Marquês)…"
                                    placeholderTextColor={colors.textMuted}
                                    value={name}
                                    onChangeText={setName}
                                    maxLength={120}
                                />
                            </View>
                        </View>
                        <Text style={styles.mapHint}>Toca no mapa para marcar a localização exata.</Text>
                    </View>
                )}

                {step === 2 && (
                    <View>
                        <Text style={styles.stepHint}>Que tipo de estacionamento é?</Text>
                        <View style={styles.typeGrid}>
                            {TYPE_OPTIONS.map(({ type, icon }) => {
                                const active = spotType === type;
                                return (
                                    <Pressable
                                        key={type}
                                        onPress={() => setSpotType(type)}
                                        style={({ pressed }) => [
                                            styles.typeCard,
                                            active && styles.optionActive,
                                            pressed && styles.pressed,
                                        ]}
                                    >
                                        <Ionicons
                                            name={icon}
                                            size={20}
                                            color={active ? colors.primary : colors.textMuted}
                                        />
                                        <Text style={[styles.typeLabel, active && { color: colors.primary }]}>
                                            {TYPE_DESIGN[type].label}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>

                        <Text style={styles.stepHint}>Custo</Text>
                        <View style={styles.pricingRow}>
                            {[{ v: true, label: 'Grátis' }, { v: false, label: 'Pago' }].map(({ v, label }) => {
                                const active = isFree === v;
                                return (
                                    <Pressable
                                        key={label}
                                        onPress={() => setIsFree(v)}
                                        style={({ pressed }) => [
                                            styles.pricingBtn,
                                            active && styles.optionActive,
                                            pressed && styles.pressed,
                                        ]}
                                    >
                                        <Text style={[styles.pricingText, active && { color: colors.primary }]}>
                                            {label}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>

                        <Text style={styles.stepHint}>Lotação</Text>
                        <View style={styles.capacityGrid}>
                            {CAPACITY_OPTIONS.map(({ range, label }) => {
                                const active = capacity === range;
                                return (
                                    <Pressable
                                        key={range}
                                        onPress={() => setCapacity(active ? null : range)}
                                        style={({ pressed }) => [
                                            styles.capacityBtn,
                                            active && styles.optionActive,
                                            pressed && styles.pressed,
                                        ]}
                                    >
                                        <Text style={[styles.capacityText, active && { color: colors.primary }]}>
                                            {label}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                    </View>
                )}

                {step === 3 && (
                    <View>
                        <Text style={styles.stepHint}>Que comodidades existem?</Text>
                        <View style={styles.amenityGrid}>
                            {AMENITY_DESIGN.map(({ key, icon, label }) => {
                                const active = amenities[key] === true;
                                return (
                                    <Pressable
                                        key={key}
                                        onPress={() => toggleAmenity(key)}
                                        style={({ pressed }) => [
                                            styles.amenityCard,
                                            active && styles.optionActive,
                                            pressed && styles.pressed,
                                        ]}
                                    >
                                        <Ionicons
                                            name={icon}
                                            size={18}
                                            color={active ? colors.primary : colors.textMuted}
                                        />
                                        <Text style={[styles.amenityLabel, active && { color: colors.primary }]}>
                                            {label}
                                        </Text>
                                        {active && (
                                            <Ionicons
                                                name="checkmark-circle"
                                                size={14}
                                                color={colors.primary}
                                                style={styles.amenityCheck}
                                            />
                                        )}
                                    </Pressable>
                                );
                            })}
                        </View>

                        <View style={styles.antiSpamCard}>
                            <Text style={styles.sectionLabel}>Verificação anti-spam</Text>
                            <Text style={styles.antiSpamText}>
                                Confirma que este estacionamento fica em Portugal e não numa autoestrada ou túnel.
                            </Text>
                            <Pressable
                                style={({ pressed }) => [styles.checkboxRow, pressed && styles.pressed]}
                                onPress={() => setConfirmed((c) => !c)}
                                accessibilityRole="checkbox"
                                accessibilityState={{ checked: confirmed }}
                            >
                                <View style={[styles.checkbox, confirmed && styles.checkboxChecked]}>
                                    {confirmed && <Ionicons name="checkmark" size={12} color={colors.white} />}
                                </View>
                                <Text style={styles.checkboxLabel}>
                                    Confirmo que este é um local de estacionamento válido em Portugal
                                </Text>
                            </Pressable>
                        </View>
                        {!user && (
                            <Text style={styles.authHint}>
                                Vais precisar de iniciar sessão para submeter.
                            </Text>
                        )}
                    </View>
                )}
            </ScrollView>

            {/* Ações */}
            <View style={styles.actions}>
                {step > 1 && (
                    <Pressable
                        style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
                        onPress={() => setStep((s) => (s - 1) as Step)}
                        hitSlop={8}
                    >
                        <Text style={styles.backBtnText}>Voltar</Text>
                    </Pressable>
                )}
                <Pressable
                    style={({ pressed }) => [
                        styles.primaryBtn,
                        styles.actionBtn,
                        (!canContinue() || submitting) && styles.btnDisabled,
                        pressed && !submitting && canContinue() && styles.pressed,
                    ]}
                    onPress={handleContinue}
                    disabled={!canContinue() || submitting}
                >
                    {submitting ? (
                        <ActivityIndicator color={colors.white} />
                    ) : (
                        <Text style={styles.primaryBtnText}>
                            {step === 3 ? 'Submeter' : 'Continuar'}
                        </Text>
                    )}
                </Pressable>
            </View>
        </KeyboardAvoidingView>
    );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 12,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    },
    stepLabel: {
        fontSize: 12,
        fontFamily: MONO,
        color: colors.textMuted,
    },
    progress: {
        flexDirection: 'row',
        gap: 6,
    },
    progressSegment: {
        flex: 1,
        height: 4,
        borderRadius: 2,
    },
    body: {
        flex: 1,
    },
    bodyContent: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    stepHint: {
        fontSize: 14,
        color: colors.textMuted,
        marginBottom: 12,
        marginTop: 4,
    },
    mapCard: {
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 12,
    },
    map: {
        height: 180,
    },
    mapFooter: {
        padding: 12,
    },
    input: {
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontSize: 14,
        color: colors.text,
    },
    mapHint: {
        fontSize: 11,
        fontFamily: MONO,
        color: colors.textMuted,
    },
    typeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
    },
    typeCard: {
        width: '48%',
        flexGrow: 1,
        alignItems: 'center',
        gap: 8,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
    },
    optionActive: {
        borderColor: colors.primary,
        backgroundColor: colors.primary + '1A',
    },
    typeLabel: {
        fontSize: 13,
        fontWeight: '500',
        color: colors.textMuted,
    },
    pricingRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },
    pricingBtn: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
    },
    pricingText: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.textMuted,
    },
    capacityGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    capacityBtn: {
        flexBasis: '30%',
        flexGrow: 1,
        alignItems: 'center',
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
    },
    capacityText: {
        fontSize: 12,
        fontFamily: MONO,
        color: colors.textMuted,
    },
    amenityGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 20,
    },
    amenityCard: {
        width: '48%',
        flexGrow: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
    },
    amenityLabel: {
        fontSize: 12,
        fontWeight: '500',
        fontFamily: MONO,
        color: colors.textMuted,
        flexShrink: 1,
    },
    amenityCheck: {
        marginLeft: 'auto',
    },
    antiSpamCard: {
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
    },
    sectionLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 8,
    },
    advancedLink: {
        alignSelf: 'flex-end',
        fontSize: 11,
        color: colors.textMuted,
        textDecorationLine: 'underline',
        marginTop: 6,
    },
    antiSpamText: {
        fontSize: 12,
        color: colors.textMuted,
        marginBottom: 12,
    },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    checkbox: {
        width: 18,
        height: 18,
        borderRadius: 4,
        borderWidth: 1.5,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxChecked: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    checkboxLabel: {
        flex: 1,
        fontSize: 12,
        color: colors.text,
    },
    authHint: {
        fontSize: 12,
        color: colors.textMuted,
        textAlign: 'center',
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 16,
    },
    backBtn: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    backBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
    },
    primaryBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: colors.primary,
    },
    actionBtn: {
        flex: 1,
    },
    btnDisabled: {
        opacity: 0.5,
    },
    pressed: {
        opacity: 0.85,
        transform: [{ scale: 0.99 }],
    },
    primaryBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.white,
    },
    successContent: {
        padding: 24,
        alignItems: 'center',
    },
    successIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: colors.primary + '1A',
        borderWidth: 1,
        borderColor: colors.primary + '4D',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    successTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 8,
    },
    successSubtitle: {
        fontSize: 14,
        color: colors.textMuted,
        marginBottom: 4,
        textAlign: 'center',
    },
    successStatus: {
        fontSize: 12,
        fontFamily: MONO,
        color: colors.textMuted,
        marginBottom: 24,
    },
    nextCard: {
        width: '100%',
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    nextRow: {
        flexDirection: 'row',
        gap: 8,
        paddingVertical: 6,
    },
    nextRowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    nextNum: {
        fontSize: 12,
        fontFamily: MONO,
        color: colors.primary,
    },
    nextText: {
        flex: 1,
        fontSize: 12,
        color: colors.textMuted,
    },
});
