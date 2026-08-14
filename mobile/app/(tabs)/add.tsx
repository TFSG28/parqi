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
import { AMENITY_DESIGN, MONO, PALETTE, TYPE_COLOR, TYPE_DESIGN } from '../../src/theme/design';
import type { ThemeColors } from '../../src/theme/colors';
import type { CapacityRange, ParkingType } from '../../src/types/parking';

type Step = 1 | 2 | 3;

interface LatLng {
    latitude: number;
    longitude: number;
}

const DEFAULT_LOCATION: LatLng = { latitude: 38.7369, longitude: -9.1427 };

const STEPS: { id: Step; label: string }[] = [
    { id: 1, label: 'Localização' },
    { id: 2, label: 'Tipo' },
    { id: 3, label: 'Detalhes' },
];

const TYPE_OPTIONS: ParkingType[] = ['SURFACE', 'UNDERGROUND', 'MULTI_STORY', 'STREET'];

const CAPACITY_OPTIONS: { range: CapacityRange; label: string }[] = [
    { range: 'RANGE_1_5', label: '<5' },
    { range: 'RANGE_6_20', label: '6–20' },
    { range: 'RANGE_21_50', label: '21–50' },
    { range: 'RANGE_51_100', label: '51–100' },
    { range: 'RANGE_100_PLUS', label: '100+' },
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
                    <Ionicons name="checkmark" size={36} color={colors.white} />
                </View>
                <Text style={styles.successTitle}>Submetido!</Text>
                <Text style={styles.successSubtitle}>
                    O teu local foi enviado para validação pela comunidade.
                </Text>
                <View style={styles.successPill}>
                    <Ionicons name="time" size={12} color={PALETTE.amberDeep} />
                    <Text style={styles.successPillText}>Em revisão</Text>
                </View>
                <View style={styles.nextCard}>
                    {[
                        'Votos positivos aumentam a confiança (+1,5)',
                        'Votos negativos diminuem (−2,0)',
                        'Confiança ≥ 5 → estado Verificado',
                        'Aparece no mapa para toda a comunidade',
                    ].map((s, i) => (
                        <View key={s} style={styles.nextRow}>
                            <View style={styles.nextNumCircle}>
                                <Text style={styles.nextNum}>{i + 1}</Text>
                            </View>
                            <Text style={styles.nextText}>{s}</Text>
                        </View>
                    ))}
                </View>
                <Pressable
                    style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
                    onPress={reset}
                >
                    <Text style={styles.primaryBtnText}>Adicionar outro local</Text>
                </Pressable>
            </ScrollView>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            {/* Header + progresso com labels, como no design v2 */}
            <View style={styles.header}>
                <Text style={styles.title}>Adicionar Local</Text>
                <View style={styles.steps}>
                    {STEPS.map(({ id, label }) => (
                        <View key={id} style={styles.step}>
                            <View
                                style={[styles.stepSegment, { backgroundColor: id <= step ? colors.primary : colors.border }]}
                            />
                            <Text style={[styles.stepLabel, id === step && { color: colors.primary }]}>
                                {label}
                            </Text>
                        </View>
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
                    <View style={styles.stepBody}>
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
                        </View>
                        <Text style={styles.mapHint}>Toca no mapa para marcar a posição exata.</Text>

                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>NOME</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="ex.: Parque Marquês…"
                                placeholderTextColor={colors.textMuted}
                                value={name}
                                onChangeText={setName}
                                maxLength={120}
                            />
                        </View>

                        <View style={styles.coordRow}>
                            <View style={styles.fieldGroup}>
                                <Text style={styles.fieldLabel}>LATITUDE</Text>
                                <TextInput
                                    style={[styles.input, styles.coordInput]}
                                    value={location.latitude.toFixed(5)}
                                    editable={false}
                                />
                            </View>
                            <View style={styles.fieldGroup}>
                                <Text style={styles.fieldLabel}>LONGITUDE</Text>
                                <TextInput
                                    style={[styles.input, styles.coordInput]}
                                    value={location.longitude.toFixed(5)}
                                    editable={false}
                                />
                            </View>
                        </View>
                    </View>
                )}

                {step === 2 && (
                    <View style={styles.stepBody}>
                        <Text style={styles.stepHint}>TIPO DE ESTACIONAMENTO</Text>
                        <View style={styles.typeGrid}>
                            {TYPE_OPTIONS.map((t) => {
                                const active = spotType === t;
                                const color = TYPE_COLOR[t];
                                return (
                                    <Pressable
                                        key={t}
                                        onPress={() => setSpotType(t)}
                                        style={({ pressed }) => [
                                            styles.typeCard,
                                            active && styles.optionActive,
                                            pressed && styles.pressed,
                                        ]}
                                    >
                                        <View style={[styles.typeIcon, { backgroundColor: color + '18' }]}>
                                            <Ionicons name="location" size={18} color={color} />
                                        </View>
                                        <Text style={[styles.typeLabel, active && { color: colors.primary }]}>
                                            {TYPE_DESIGN[t].label}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>

                        <Text style={styles.stepHint}>TARIFA</Text>
                        <View style={styles.pricingRow}>
                            {[{ v: true, label: 'Gratuito' }, { v: false, label: 'Pago' }].map(({ v, label }) => {
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
                        {isFree === false && (
                            <TextInput
                                style={styles.input}
                                placeholder="ex.: €1,50/h"
                                placeholderTextColor={colors.textMuted}
                            />
                        )}

                        <Text style={styles.stepHint}>CAPACIDADE</Text>
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
                    <View style={styles.stepBody}>
                        <Text style={styles.stepHint}>COMODIDADES</Text>
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
                        <Text style={styles.backBtnText}>Anterior</Text>
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
    title: {
        fontSize: 20,
        fontWeight: '800',
        color: colors.text,
        marginBottom: 14,
    },
    steps: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
    },
    step: {
        flex: 1,
        alignItems: 'center',
        gap: 4,
    },
    stepSegment: {
        height: 6,
        width: '100%',
        borderRadius: 3,
    },
    stepLabel: {
        fontSize: 10,
        fontWeight: '500',
        color: colors.textMuted,
    },
    advancedLink: {
        alignSelf: 'flex-end',
        fontSize: 11,
        color: colors.textMuted,
        textDecorationLine: 'underline',
        marginTop: 8,
    },
    body: {
        flex: 1,
    },
    bodyContent: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    stepBody: {
        gap: 14,
    },
    stepHint: {
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 1,
        color: colors.textMuted,
    },
    mapCard: {
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 16,
        overflow: 'hidden',
    },
    map: {
        height: 180,
    },
    mapHint: {
        fontSize: 11,
        fontFamily: MONO,
        color: colors.textMuted,
    },
    fieldGroup: {
        gap: 6,
    },
    fieldLabel: {
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 1,
        color: colors.textMuted,
    },
    input: {
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 14,
        color: colors.text,
    },
    coordRow: {
        flexDirection: 'row',
        gap: 12,
    },
    coordInput: {
        fontFamily: MONO,
    },
    typeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    typeCard: {
        width: '48%',
        flexGrow: 1,
        alignItems: 'center',
        gap: 8,
        padding: 16,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: colors.border,
        backgroundColor: colors.card,
    },
    optionActive: {
        borderColor: colors.primary,
        backgroundColor: colors.primary + '0D',
    },
    typeIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    typeLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.text,
    },
    pricingRow: {
        flexDirection: 'row',
        gap: 10,
    },
    pricingBtn: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: colors.border,
        backgroundColor: colors.card,
    },
    pricingText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
    },
    capacityGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    capacityBtn: {
        flexBasis: '30%',
        flexGrow: 1,
        alignItems: 'center',
        paddingVertical: 10,
        borderRadius: 12,
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
        gap: 10,
    },
    amenityCard: {
        width: '48%',
        flexGrow: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 12,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: colors.border,
        backgroundColor: colors.card,
    },
    amenityLabel: {
        fontSize: 12,
        fontWeight: '500',
        color: colors.text,
        flexShrink: 1,
    },
    amenityCheck: {
        marginLeft: 'auto',
    },
    antiSpamCard: {
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 16,
        padding: 16,
        gap: 10,
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
    },
    antiSpamText: {
        fontSize: 12,
        color: colors.textMuted,
    },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    checkbox: {
        width: 18,
        height: 18,
        borderRadius: 5,
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
        borderRadius: 16,
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
        borderRadius: 16,
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
        width: 80,
        height: 80,
        borderRadius: 24,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    successTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: colors.text,
        marginBottom: 8,
    },
    successSubtitle: {
        fontSize: 14,
        color: colors.textMuted,
        marginBottom: 12,
        textAlign: 'center',
        lineHeight: 20,
    },
    successPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: PALETTE.amber + '1A',
        marginBottom: 24,
    },
    successPillText: {
        fontSize: 12,
        fontWeight: '600',
        color: PALETTE.amberDeep,
    },
    nextCard: {
        width: '100%',
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 16,
        padding: 16,
        gap: 10,
        marginBottom: 24,
    },
    nextRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    nextNumCircle: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: colors.primary + '1A',
        alignItems: 'center',
        justifyContent: 'center',
    },
    nextNum: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.primary,
    },
    nextText: {
        flex: 1,
        fontSize: 13,
        color: colors.textMuted,
    },
});
