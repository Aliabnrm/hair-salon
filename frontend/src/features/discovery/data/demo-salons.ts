import type { Category, DemoSalon } from '../model/discovery.types';
// Figma fixtures only. No catalog, reservation, or availability API is implied.
export const categories: Category[] = [
  {
    id: 'haircut',
    label: 'کوتاهی مو',
    types: ['men', 'women'],
  },
  {
    id: 'beard',
    label: 'ریش و صورت',
    types: ['men'],
  },
  {
    id: 'color',
    label: 'رنگ مو',
    types: ['men', 'women'],
  },
  {
    id: 'brushing',
    label: 'براشینگ',
    types: ['women'],
  },
  {
    id: 'keratin',
    label: 'کراتین',
    types: ['women'],
  },
  {
    id: 'nails',
    label: 'ناخن',
    types: ['women'],
  },
  {
    id: 'skin',
    label: 'پاکسازی پوست',
    types: ['men', 'women'],
  },
];
export const cities = [
  {
    id: 'tehran',
    name: 'تهران',
    neighborhoods: ['سعادت‌آباد', 'یوسف‌آباد', 'ونک', 'تجریش', 'پونک', 'نارمک'],
  },
  {
    id: 'shiraz',
    name: 'شیراز',
    neighborhoods: ['قصرالدشت', 'معالی‌آباد', 'ستارخان'],
  },
  {
    id: 'isfahan',
    name: 'اصفهان',
    neighborhoods: ['جلفا', 'چهارباغ', 'شیخ صدوق'],
  },
  {
    id: 'mashhad',
    name: 'مشهد',
    neighborhoods: ['احمدآباد', 'وکیل‌آباد', 'سجاد'],
  },
];
export const demoSalons: DemoSalon[] = [
  {
    id: 'mahour',
    name: 'پیرایش ماهور',
    type: 'men',
    cityId: 'tehran',
    neighborhood: 'سعادت‌آباد',
    image: '/assets/salons/salon-mahour.jpg',
    imageAlt: 'صندلی‌های چرمی قهوه‌ای در فضای آرایشگاه',
    hours: '۱۰ تا ۲۱',
    services: [
      {
        name: 'اصلاح مو کلاسیک',
        category: 'haircut',
        price: 350000,
      },
      {
        name: 'فید و طراحی مدرن',
        category: 'haircut',
        price: 450000,
      },
      {
        name: 'اصلاح مو و صورت',
        category: 'haircut',
        price: 540000,
      },
      {
        name: 'اصلاح صورت با حوله گرم',
        category: 'beard',
        price: 220000,
      },
      {
        name: 'فرم‌دهی ریش',
        category: 'beard',
        price: 250000,
      },
      {
        name: 'رنگ مو و ریش آقایان',
        category: 'color',
        price: 850000,
      },
      {
        name: 'پاکسازی پوست آقایان',
        category: 'skin',
        price: 900000,
      },
    ],
  },
  {
    id: 'niloufar',
    name: 'سالن زیبایی نیلوفر',
    type: 'women',
    cityId: 'tehran',
    neighborhood: 'یوسف‌آباد',
    image: '/assets/salons/salon-niloufar.jpg',
    imageAlt: 'میز و آینه‌های روشن در سالن زیبایی',
    hours: '۹ تا ۲۰',
    services: [
      {
        name: 'کوتاهی و براشینگ',
        category: 'haircut',
        price: 1050000,
      },
      {
        name: 'کوتاهی سرشاخه',
        category: 'haircut',
        price: 500000,
      },
      {
        name: 'براشینگ',
        category: 'brushing',
        price: 530000,
      },
      {
        name: 'شینیون مجلسی',
        category: 'brushing',
        price: 2420000,
      },
      {
        name: 'رنگ ریشه',
        category: 'color',
        price: 1980000,
      },
      {
        name: 'بالیاژ',
        category: 'color',
        price: 7150000,
      },
      {
        name: 'کراتین مو',
        category: 'keratin',
        price: 5280000,
      },
      {
        name: 'پاکسازی پوست',
        category: 'skin',
        price: 1320000,
      },
    ],
  },
  {
    id: 'sarv',
    name: 'پیرایش سرو',
    type: 'men',
    cityId: 'tehran',
    neighborhood: 'ونک',
    image: '/assets/salons/salon-sarv.jpg',
    imageAlt: 'دو صندلی مشکی آرایشگاه کنار دیوار سنگی',
    hours: '۱۱ تا ۲۲',
    services: [
      {
        name: 'اصلاح مو کلاسیک',
        category: 'haircut',
        price: 320000,
      },
      {
        name: 'فید و طراحی مدرن',
        category: 'haircut',
        price: 410000,
      },
      {
        name: 'اصلاح مو و صورت',
        category: 'haircut',
        price: 490000,
      },
      {
        name: 'اصلاح صورت با حوله گرم',
        category: 'beard',
        price: 200000,
      },
      {
        name: 'فرم‌دهی ریش',
        category: 'beard',
        price: 230000,
      },
    ],
  },
  {
    id: 'termeh',
    name: 'خانه زیبایی ترمه',
    type: 'women',
    cityId: 'tehran',
    neighborhood: 'تجریش',
    image: '/assets/salons/salon-termeh.jpg',
    imageAlt: 'صندلی سالن مقابل آینه‌ای با نور ملایم',
    hours: '۱۰ تا ۲۰',
    services: [
      {
        name: 'کوتاهی و براشینگ',
        category: 'haircut',
        price: 1140000,
      },
      {
        name: 'کوتاهی سرشاخه',
        category: 'haircut',
        price: 540000,
      },
      {
        name: 'براشینگ',
        category: 'brushing',
        price: 580000,
      },
      {
        name: 'شینیون مجلسی',
        category: 'brushing',
        price: 2640000,
      },
      {
        name: 'رنگ ریشه',
        category: 'color',
        price: 2160000,
      },
      {
        name: 'بالیاژ',
        category: 'color',
        price: 7800000,
      },
      {
        name: 'کراتین مو',
        category: 'keratin',
        price: 5760000,
      },
      {
        name: 'مانیکور',
        category: 'nails',
        price: 480000,
      },
      {
        name: 'کاشت ناخن ژل',
        category: 'nails',
        price: 1680000,
      },
      {
        name: 'پاکسازی پوست',
        category: 'skin',
        price: 1440000,
      },
    ],
  },
  {
    id: 'golbarg',
    name: 'استودیو ناخن گلبرگ',
    type: 'women',
    cityId: 'tehran',
    neighborhood: 'پونک',
    image: '/assets/salons/salon-golbarg.jpg',
    imageAlt: 'ابزارهای مانیکور روی حوله سفید',
    hours: '۱۰ تا ۲۰',
    services: [
      {
        name: 'مانیکور',
        category: 'nails',
        price: 340000,
      },
      {
        name: 'کاشت ناخن ژل',
        category: 'nails',
        price: 1190000,
      },
      {
        name: 'پاکسازی پوست',
        category: 'skin',
        price: 1020000,
      },
    ],
  },
  {
    id: 'arta',
    name: 'پیرایش آرتا',
    type: 'men',
    cityId: 'tehran',
    neighborhood: 'نارمک',
    image: '/assets/salons/salon-arta.jpg',
    imageAlt: 'صندلی مشکی و نقره‌ای آرایشگاه',
    hours: '۱۰ تا ۲۱',
    services: [
      {
        name: 'اصلاح مو کلاسیک',
        category: 'haircut',
        price: 280000,
      },
      {
        name: 'اصلاح مو و صورت',
        category: 'haircut',
        price: 430000,
      },
      {
        name: 'اصلاح صورت با حوله گرم',
        category: 'beard',
        price: 180000,
      },
      {
        name: 'رنگ مو و ریش آقایان',
        category: 'color',
        price: 680000,
      },
    ],
  },
  {
    id: 'yas',
    name: 'سالن زیبایی یاس',
    type: 'women',
    cityId: 'shiraz',
    neighborhood: 'قصرالدشت',
    image: '/assets/salons/salon-yas.jpg',
    imageAlt: 'فضای مدرن سالن با صندلی‌ها و آینه‌ها',
    hours: '۹ تا ۲۰',
    services: [
      {
        name: 'کوتاهی و براشینگ',
        category: 'haircut',
        price: 860000,
      },
      {
        name: 'کوتاهی سرشاخه',
        category: 'haircut',
        price: 410000,
      },
      {
        name: 'براشینگ',
        category: 'brushing',
        price: 430000,
      },
      {
        name: 'شینیون مجلسی',
        category: 'brushing',
        price: 1980000,
      },
      {
        name: 'رنگ ریشه',
        category: 'color',
        price: 1620000,
      },
      {
        name: 'بالیاژ',
        category: 'color',
        price: 5850000,
      },
      {
        name: 'کراتین مو',
        category: 'keratin',
        price: 4320000,
      },
      {
        name: 'مانیکور',
        category: 'nails',
        price: 360000,
      },
      {
        name: 'کاشت ناخن ژل',
        category: 'nails',
        price: 1260000,
      },
      {
        name: 'پاکسازی پوست',
        category: 'skin',
        price: 1080000,
      },
    ],
  },
  {
    id: 'kohandezh',
    name: 'پیرایش کهن‌دژ',
    type: 'men',
    cityId: 'shiraz',
    neighborhood: 'معالی‌آباد',
    image: '/assets/salons/salon-kohandezh.jpg',
    imageAlt: 'صندلی‌های آرایشگاه و روشویی در نور ملایم',
    hours: '۱۰ تا ۲۲',
    services: [
      {
        name: 'اصلاح مو کلاسیک',
        category: 'haircut',
        price: 300000,
      },
      {
        name: 'فید و طراحی مدرن',
        category: 'haircut',
        price: 380000,
      },
      {
        name: 'اصلاح مو و صورت',
        category: 'haircut',
        price: 460000,
      },
      {
        name: 'اصلاح صورت با حوله گرم',
        category: 'beard',
        price: 190000,
      },
      {
        name: 'فرم‌دهی ریش',
        category: 'beard',
        price: 210000,
      },
      {
        name: 'رنگ مو و ریش آقایان',
        category: 'color',
        price: 720000,
      },
      {
        name: 'پاکسازی پوست آقایان',
        category: 'skin',
        price: 770000,
      },
    ],
  },
  {
    id: 'zayandeh',
    name: 'پیرایش زاینده',
    type: 'men',
    cityId: 'isfahan',
    neighborhood: 'جلفا',
    image: '/assets/salons/salon-zayandeh.jpg',
    imageAlt: 'ردیف صندلی‌های چرمی مشکی آرایشگاه',
    hours: '۱۰ تا ۲۱',
    services: [
      {
        name: 'اصلاح مو کلاسیک',
        category: 'haircut',
        price: 280000,
      },
      {
        name: 'فید و طراحی مدرن',
        category: 'haircut',
        price: 360000,
      },
      {
        name: 'اصلاح صورت با حوله گرم',
        category: 'beard',
        price: 180000,
      },
      {
        name: 'فرم‌دهی ریش',
        category: 'beard',
        price: 200000,
      },
      {
        name: 'پاکسازی پوست آقایان',
        category: 'skin',
        price: 720000,
      },
    ],
  },
  {
    id: 'mahbanoo',
    name: 'سالن ماه‌بانو',
    type: 'women',
    cityId: 'isfahan',
    neighborhood: 'چهارباغ',
    image: '/assets/salons/salon-mahbanoo.jpg',
    imageAlt: 'فضای سالن با چراغ‌های آویز روشن',
    hours: '۹ تا ۱۹',
    services: [
      {
        name: 'کوتاهی و براشینگ',
        category: 'haircut',
        price: 810000,
      },
      {
        name: 'براشینگ',
        category: 'brushing',
        price: 410000,
      },
      {
        name: 'شینیون مجلسی',
        category: 'brushing',
        price: 1870000,
      },
      {
        name: 'رنگ ریشه',
        category: 'color',
        price: 1530000,
      },
      {
        name: 'کراتین مو',
        category: 'keratin',
        price: 4080000,
      },
      {
        name: 'مانیکور',
        category: 'nails',
        price: 340000,
      },
    ],
  },
  {
    id: 'parseh',
    name: 'پیرایش پارسه',
    type: 'men',
    cityId: 'mashhad',
    neighborhood: 'احمدآباد',
    image: '/assets/salons/salon-parseh.jpg',
    imageAlt: 'ردیف صندلی‌های آرایشگاه کنار پنجره',
    hours: '۱۰ تا ۲۱',
    services: [
      {
        name: 'اصلاح مو کلاسیک',
        category: 'haircut',
        price: 260000,
      },
      {
        name: 'اصلاح مو و صورت',
        category: 'haircut',
        price: 410000,
      },
      {
        name: 'اصلاح صورت با حوله گرم',
        category: 'beard',
        price: 170000,
      },
      {
        name: 'فرم‌دهی ریش',
        category: 'beard',
        price: 190000,
      },
    ],
  },
  {
    id: 'roz',
    name: 'سالن زیبایی رز سپید',
    type: 'women',
    cityId: 'mashhad',
    neighborhood: 'وکیل‌آباد',
    image: '/assets/salons/salon-roz.jpg',
    imageAlt: 'آینه گرد روی قفسه سفید',
    hours: '۹ تا ۱۹',
    services: [
      {
        name: 'کوتاهی و براشینگ',
        category: 'haircut',
        price: 760000,
      },
      {
        name: 'کوتاهی سرشاخه',
        category: 'haircut',
        price: 360000,
      },
      {
        name: 'براشینگ',
        category: 'brushing',
        price: 380000,
      },
      {
        name: 'رنگ ریشه',
        category: 'color',
        price: 1440000,
      },
      {
        name: 'کراتین مو',
        category: 'keratin',
        price: 3840000,
      },
    ],
  },
];
