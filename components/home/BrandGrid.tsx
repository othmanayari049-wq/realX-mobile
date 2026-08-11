import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';
import { StateSurface } from '../StateSurface';
import { triggerSubtleHaptic } from '../../utils/haptics';
import { useTranslation } from 'react-i18next';
import { logger } from '../../utils/logger';
import { useAppTheme } from '../../context/AppThemeContext';
import { useAppLocale } from '../../context/LocaleContext';
import { homeQueryOptions, type HomeBrandItem } from '../../utils/homeQueries';
import {
    HOME_HORIZONTAL_GUTTER,
    HOME_SECTION_HEADER_GAP,
    HOME_SECTION_TOP_SPACING,
} from './layout';
import HomeSectionHeading from './HomeSectionHeading';

type BrandItem = HomeBrandItem;

const BRAND_TILE_SIZE = 64;
const BRAND_TILE_GAP = 14;
const BRAND_ROW_SIDE_PADDING = HOME_HORIZONTAL_GUTTER;

function BrandRow({
    items,
    onPressBrand,
}: {
    items: BrandItem[];
    onPressBrand: (brand: BrandItem) => void;
}) {
    const { theme } = useAppTheme();
    const renderBrand = (brand: BrandItem) => (
        <Pressable
            key={brand.id}
            style={styles.brandItem}
            onPress={() => onPressBrand(brand)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={brand.name}
        >
            <Image
                source={{ uri: brand.logoUrl }}
                style={[
                    styles.imageContainer,
                    { backgroundColor: theme.logoTile, borderColor: theme.logoTileBorder },
                ]}
                contentFit="contain"
                cachePolicy="memory-disk"
            />
        </Pressable>
    );

    return (
        <View style={styles.rowViewport}>
            <ScrollView
                horizontal
                style={styles.rowScroll}
                showsHorizontalScrollIndicator={false}
                bounces={false}
                overScrollMode="never"
                nestedScrollEnabled
                directionalLockEnabled
                canCancelContentTouches
                keyboardShouldPersistTaps="always"
                scrollEventThrottle={16}
                contentContainerStyle={styles.scrollContent}
            >
                <View style={styles.rowSegment}>
                    {items.map(renderBrand)}
                </View>
            </ScrollView>
        </View>
    );
}

export default function BrandGrid() {
    const { t } = useTranslation();
    const { theme } = useAppTheme();
    const { isRTL } = useAppLocale();
    const {
        data: brands = [],
        error,
        isLoading,
        refetch,
    } = useQuery(homeQueryOptions.brands());
    const router = useRouter();
    const displayedBrands = useMemo(() => (isRTL ? [...brands].reverse() : brands), [brands, isRTL]);
    const brandLabelPrefix = t('brand_header_prefix');
    const brandLabelHighlight = t('brand_header_highlight');

    useEffect(() => {
        if (error) logger.error('Error fetching brands:', error);
    }, [error]);

    const handlePress = (brand: BrandItem) => {
        const vendorId = brand.vendorId?.trim();
        if (!vendorId) return;

        triggerSubtleHaptic();
        router.push({ pathname: '/vendor/[id]', params: { id: vendorId } });
    };

    // Split brands into rows: ≤4 = 1 row, 5-8 = 2 rows, >8 = 2 scrollable rows
    const { row1, row2, isSingleRow } = useMemo(() => {
        const count = displayedBrands.length;
        if (count <= 4) {
            return { row1: displayedBrands, row2: [], isSingleRow: true };
        }
        if (count <= 8) {
            const mid = Math.ceil(count / 2);
            return {
                row1: displayedBrands.slice(0, mid),
                row2: displayedBrands.slice(mid),
                isSingleRow: false,
            };
        }
        // >8: evenly distribute across 2 scrollable rows
        const mid = Math.ceil(count / 2);
        return {
            row1: displayedBrands.slice(0, mid),
            row2: displayedBrands.slice(mid),
            isSingleRow: false,
        };
    }, [displayedBrands]);

    if (isLoading) {
        return (
            <View style={[ styles.loaderContainer]}>
                <ActivityIndicator size="small" color={theme.brand} />
            </View>
        );
    }

    if (error && displayedBrands.length === 0) {
        return <StateSurface kind="error" compact onRetry={() => void refetch()} />;
    }

    if (displayedBrands.length === 0) {
        return null;
    }

    return (
        <View style={styles.container}>
            <HomeSectionHeading prefix={brandLabelPrefix} highlight={brandLabelHighlight} />
            <BrandRow items={row1} onPressBrand={handlePress} />
            {!isSingleRow && (
                <View style={styles.rowSpacing}>
                    <BrandRow items={row2} onPressBrand={handlePress} />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingTop: HOME_SECTION_TOP_SPACING,
    },
    loaderContainer: {
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
    },
    rowViewport: {
        width: '100%',
        height: BRAND_TILE_SIZE,
        overflow: 'hidden',
    },
    rowScroll: {
        flex: 1,
    },
    scrollContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rowSegment: {
        flexDirection: 'row',
        gap: BRAND_TILE_GAP,
        paddingHorizontal: BRAND_ROW_SIDE_PADDING,
    },
    rowSpacing: {
        marginTop: HOME_SECTION_HEADER_GAP,
    },
    brandItem: {
        alignItems: 'center',
    },
    imageContainer: {
        width: 64,
        height: 64,
        borderRadius: 14,
        borderWidth: StyleSheet.hairlineWidth,
        backgroundColor: 'transparent',
    },
});
