/**
 * SEO Helper Utilities for SHOPACVN.COM
 * Optimized for Vietnamese market - Liên Quân Mobile game accounts
 */

// Site Configuration
export const SEO_CONFIG = {
  siteName: 'SHOPACVN.COM',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://shopacvn.com',
  locale: 'vi_VN',
  language: 'vi',
  // Brand info
  brand: {
    name: 'SHOPACVN.COM',
    slogan: 'Shop Bán Nick Liên Quân Uy Tín #1 Việt Nam',
    phone: '',
    email: 'demo@example.com',
    address: 'Việt Nam',
  },

  // Social profiles
  social: {
    facebook: '',
    tiktok: '',
    zalo: '',
  },

  // Default images
  images: {
    logo: '/images/logo.png',
    ogImage: '/images/banner_topup.jpg',
    favicon: '/favicon.ico',
  },
} as const;

// Primary SEO Keywords for Vietnamese market
export const SEO_KEYWORDS = {
  primary: [
    'bán nick liên quân',
    'mua nick liên quân',
    'shop acc liên quân uy tín',
    'nick liên quân giá rẻ',
    'acc liên quân mobile',
  ],
  secondary: [
    'acc liên quân chính chủ',
    'mua acc liên quân giá rẻ',
    'shop nick lien quan',
    'tài khoản liên quân mobile',
    'acc liên quân vip',
    'nick lq giá rẻ',
    'shop uy tín bán acc',
    'acc liên quân full tướng',
    'nick liên quân có skin',
    'shop acc game uy tín',
    'mua nick lq uy tín',
    'bán tài khoản liên quân',
    'acc lq chất lượng',
    'shop bán acc 24/7',
    'mua nick liên quân auto',
  ],
  all: function () {
    return [...this.primary, ...this.secondary];
  },
};

/**
 * Build SEO-optimized title with brand suffix
 * Target: 50-60 characters for optimal display
 */
export function buildTitle(pageTitle: string, includeBrand = true): string {
  if (!includeBrand) return pageTitle;

  const brandSuffix = ' | SHOPACVN.COM';
  const maxLength = 60;

  if (pageTitle.length + brandSuffix.length <= maxLength) {
    return `${pageTitle}${brandSuffix}`;
  }

  // Truncate page title to fit
  const availableLength = maxLength - brandSuffix.length - 3;
  return `${pageTitle.substring(0, availableLength)}...${brandSuffix}`;
}

/**
 * Build SEO-optimized description
 * Target: 130-155 characters for optimal display
 */
export function buildDescription(template: {
  productName?: string;
  gameName?: string;
  price?: number;
  features?: string[];
  customText?: string;
}): string {
  const { productName, gameName = 'Liên Quân Mobile', price, features, customText } = template;

  if (customText) {
    return customText.length > 155 ? customText.substring(0, 152) + '...' : customText;
  }

  let description = '';

  if (productName) {
    description = `${productName} - `;
  }

  if (price) {
    description += `Giá ${price.toLocaleString('vi-VN')}đ. `;
  }

  if (features && features.length > 0) {
    description += features.slice(0, 3).join(', ') + '. ';
  }

  description += `Mua nick ${gameName} uy tín, giá rẻ. Giao dịch tự động 24/7, bảo hành 100%.`;

  // Ensure length is within bounds
  if (description.length > 155) {
    description = description.substring(0, 152) + '...';
  }

  return description;
}

/**
 * Build canonical URL
 */
export function buildCanonicalUrl(path: string): string {
  const baseUrl = SEO_CONFIG.siteUrl.replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}

/**
 * Organization JSON-LD Schema
 */
export function organizationJsonLd() {
  const sameAs = Object.values(SEO_CONFIG.social).filter(Boolean);

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SEO_CONFIG.siteUrl}/#organization`,
    name: SEO_CONFIG.brand.name,
    url: SEO_CONFIG.siteUrl,
    logo: {
      '@type': 'ImageObject',
      url: `${SEO_CONFIG.siteUrl}${SEO_CONFIG.images.logo}`,
      width: 512,
      height: 512,
    },
    description: `${SEO_CONFIG.brand.slogan}. Chuyên bán nick Liên Quân Mobile uy tín, giá rẻ, acc chất lượng, giao dịch tự động 24/7.`,
    ...(sameAs.length > 0 && { sameAs }),
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'VN',
    },
  };
}

/**
 * Website JSON-LD Schema
 */
export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SEO_CONFIG.siteUrl}/#website`,
    name: SEO_CONFIG.brand.name,
    url: SEO_CONFIG.siteUrl,
    description: 'Shop bán nick Liên Quân uy tín, acc giá rẻ, chất lượng, giao dịch tự động 24/7',
    inLanguage: 'vi-VN',
    publisher: {
      '@id': `${SEO_CONFIG.siteUrl}/#organization`,
    },
  };
}

/**
 * Product JSON-LD Schema with Offer
 */
export function productJsonLd(product: {
  id: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  gameName?: string;
  availability?: 'InStock' | 'OutOfStock' | 'PreOrder';
  condition?: 'NewCondition' | 'UsedCondition';
  sku?: string;
  rating?: {
    value: number;
    count: number;
  };
}) {
  const {
    id,
    name,
    description,
    price,
    images,
    gameName = 'Liên Quân Mobile',
    availability = 'InStock',
    condition = 'UsedCondition',
    sku,
    rating,
  } = product;

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${SEO_CONFIG.siteUrl}/product/${id}`,
    name: `${name} - Nick ${gameName}`,
    description: description,
    image: images.map((img) => (img.startsWith('http') ? img : `${SEO_CONFIG.siteUrl}${img}`)),
    sku: sku || id,
    brand: {
      '@type': 'Brand',
      name: gameName,
    },
    category: 'Tài khoản game',
    offers: {
      '@type': 'Offer',
      url: `${SEO_CONFIG.siteUrl}/product/${id}`,
      priceCurrency: 'VND',
      price: price,
      priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      availability: `https://schema.org/${availability}`,
      itemCondition: `https://schema.org/${condition}`,
      seller: {
        '@type': 'Organization',
        name: SEO_CONFIG.brand.name,
      },
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
        merchantReturnDays: 3,
        returnMethod: 'https://schema.org/ReturnByMail',
        returnFees: 'https://schema.org/FreeReturn',
      },
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingRate: {
          '@type': 'MonetaryAmount',
          value: 0,
          currency: 'VND',
        },
        deliveryTime: {
          '@type': 'ShippingDeliveryTime',
          handlingTime: {
            '@type': 'QuantitativeValue',
            minValue: 0,
            maxValue: 1,
            unitCode: 'MIN',
          },
          transitTime: {
            '@type': 'QuantitativeValue',
            minValue: 0,
            maxValue: 5,
            unitCode: 'MIN',
          },
        },
        shippingDestination: {
          '@type': 'DefinedRegion',
          addressCountry: 'VN',
        },
      },
    },
  };

  // Add aggregate rating if available
  if (rating && rating.count > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: rating.value,
      reviewCount: rating.count,
      bestRating: 5,
      worstRating: 1,
    };
  }

  return schema;
}

/**
 * BreadcrumbList JSON-LD Schema
 */
export function breadcrumbJsonLd(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${SEO_CONFIG.siteUrl}${item.url}`,
    })),
  };
}

/**
 * FAQ JSON-LD Schema
 */
export function faqJsonLd(items: Array<{ question: string; answer: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

/**
 * ItemList JSON-LD Schema for category/list pages
 */
export function itemListJsonLd(
  items: Array<{
    id: string;
    name: string;
    url: string;
    image?: string;
    price?: number;
  }>
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Product',
        '@id': item.url.startsWith('http') ? item.url : `${SEO_CONFIG.siteUrl}${item.url}`,
        name: item.name,
        url: item.url.startsWith('http') ? item.url : `${SEO_CONFIG.siteUrl}${item.url}`,
        image: item.image,
        offers: item.price
          ? {
              '@type': 'Offer',
              priceCurrency: 'VND',
              price: item.price,
            }
          : undefined,
      },
    })),
  };
}

/**
 * LocalBusiness JSON-LD Schema
 */
export function localBusinessJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Store',
    '@id': `${SEO_CONFIG.siteUrl}/#store`,
    name: SEO_CONFIG.brand.name,
    description:
      'Shop bán nick Liên Quân Mobile uy tín, acc giá rẻ, chất lượng cao, giao dịch tự động 24/7, bảo hành trọn đời.',
    url: SEO_CONFIG.siteUrl,
    telephone: SEO_CONFIG.brand.phone,
    priceRange: '₫₫',
    currenciesAccepted: 'VND',
    paymentAccepted: 'Bank Transfer, E-Wallet',
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      opens: '00:00',
      closes: '23:59',
    },
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'VN',
    },
    sameAs: [SEO_CONFIG.social.facebook, SEO_CONFIG.social.tiktok],
  };
}

/**
 * Generate all JSON-LD scripts for a page
 */
export function generateJsonLdScripts(schemas: object[]): string {
  return schemas
    .map((schema) => `<script type="application/ld+json">${JSON.stringify(schema)}</script>`)
    .join('\n');
}

/**
 * Default FAQ items for product pages
 */
export const DEFAULT_PRODUCT_FAQ = [
  {
    question: 'Mua nick Liên Quân tại SHOPACVN có uy tín không?',
    answer:
      'SHOPACVN.COM cam kết bảo hành 100% tài khoản. Chúng tôi hỗ trợ đổi thông tin, bảo mật tài khoản và hoàn tiền nếu có vấn đề.',
  },
  {
    question: 'Thời gian giao nick Liên Quân là bao lâu?',
    answer:
      'Giao dịch tự động 24/7, bạn nhận được tài khoản ngay lập tức sau khi thanh toán thành công.',
  },
  {
    question: 'Có được bảo hành khi mua acc Liên Quân không?',
    answer:
      'Có, tất cả tài khoản đều được bảo hành 100%. Chúng tôi hỗ trợ đổi mật khẩu, email và bảo mật tài khoản.',
  },
  {
    question: 'Thanh toán mua nick Liên Quân bằng cách nào?',
    answer:
      'Bạn có thể thanh toán qua chuyển khoản ngân hàng, ví điện tử (MoMo, ZaloPay) hoặc nạp tiền vào tài khoản.',
  },
];
