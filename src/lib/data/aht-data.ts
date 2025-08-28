import type { AHTData } from '@/types/aht'

// Sample data based on your spreadsheet structure
export const ahtData: AHTData[] = [
  {
    client: "sja-asc-prod",
    overallAHT: 16,
    reviewAHT: 12,
    validationAHT: 4,
    monthlyData: {
      "2024_Jun": 0,
      "2024_Jul": 0,
      "2024_Aug": 0,
      "2024_Sep": 0,
      "2024_Oct": 0,
      "2024_Nov": 0,
      "2024_Dec": 1284,
      "2025_Jan": 4143,
      "2025_Feb": 2424,
      "2025_Mar": 230,
      "2025_Apr": 220,
      "2025_May": 261,
      "2025_Jun": 178
    },
    grandTotal: 8740
  },
  {
    client: "sja-son-prod",
    overallAHT: 11,
    reviewAHT: 16,
    validationAHT: 5,
    monthlyData: {
      "2024_Jun": 386,
      "2024_Jul": 252,
      "2024_Aug": 328,
      "2024_Sep": 309,
      "2024_Oct": 566,
      "2024_Nov": 451,
      "2024_Dec": 408,
      "2025_Jan": 465,
      "2025_Feb": 436,
      "2025_Mar": 409,
      "2025_Apr": 427,
      "2025_May": 450,
      "2025_Jun": 540
    },
    grandTotal: 5412
  },
  {
    client: "sja-csu-prod-slate",
    overallAHT: 9.9,
    reviewAHT: 6.9,
    validationAHT: 3,
    monthlyData: {
      "2024_Jun": 1524,
      "2024_Jul": 1516,
      "2024_Aug": 101,
      "2024_Sep": 93,
      "2024_Oct": 60,
      "2024_Nov": 2707,
      "2024_Dec": 1543,
      "2025_Jan": 1262,
      "2025_Feb": 845,
      "2025_Mar": 1051,
      "2025_Apr": 787,
      "2025_May": 560,
      "2025_Jun": 462
    },
    grandTotal: 12511
  },
  {
    client: "sja-son-prod",
    overallAHT: 15,
    reviewAHT: 11,
    validationAHT: 4,
    monthlyData: {
      "2024_Jun": 0,
      "2024_Jul": 0,
      "2024_Aug": 0,
      "2024_Sep": 0,
      "2024_Oct": 0,
      "2024_Nov": 4271,
      "2024_Dec": 562,
      "2025_Jan": 699,
      "2025_Feb": 565,
      "2025_Mar": 268,
      "2025_Apr": 410,
      "2025_May": 3,
      "2025_Jun": 0
    },
    grandTotal: 6778
  },
  {
    client: "sja-gysu-prod",
    overallAHT: 6,
    reviewAHT: 4,
    validationAHT: 2,
    monthlyData: {
      "2024_Jun": 0,
      "2024_Jul": 0,
      "2024_Aug": 0,
      "2024_Sep": 0,
      "2024_Oct": 0,
      "2024_Nov": 0,
      "2024_Dec": 0,
      "2025_Jan": 0,
      "2025_Feb": 0,
      "2025_Mar": 0,
      "2025_Apr": 0,
      "2025_May": 0,
      "2025_Jun": 3101
    },
    grandTotal: 3101
  },
  {
    client: "sja-hu-prod",
    overallAHT: 21,
    reviewAHT: 15,
    validationAHT: 6,
    monthlyData: {
      "2024_Jun": 18,
      "2024_Jul": 35,
      "2024_Aug": 30,
      "2024_Sep": 25,
      "2024_Oct": 8,
      "2024_Nov": 7,
      "2024_Dec": 1,
      "2025_Jan": 19,
      "2025_Feb": 21,
      "2025_Mar": 23,
      "2025_Apr": 24,
      "2025_May": 15,
      "2025_Jun": 5
    },
    grandTotal: 231
  },
  {
    client: "sja-lku-prod",
    overallAHT: 1,
    reviewAHT: 1,
    validationAHT: 0,
    monthlyData: {
      "2024_Jun": 501,
      "2024_Jul": 231,
      "2024_Aug": 174,
      "2024_Sep": 40,
      "2024_Oct": 179,
      "2024_Nov": 404,
      "2024_Dec": 410,
      "2025_Jan": 686,
      "2025_Feb": 472,
      "2025_Mar": 596,
      "2025_Apr": 426,
      "2025_May": 445,
      "2025_Jun": 502
    },
    grandTotal: 5066
  },
  {
    client: "sja-lfu-prod",
    overallAHT: 11.7,
    reviewAHT: 8.7,
    validationAHT: 3,
    monthlyData: {
      "2024_Jun": 0,
      "2024_Jul": 0,
      "2024_Aug": 0,
      "2024_Sep": 0,
      "2024_Oct": 1020,
      "2024_Nov": 2022,
      "2024_Dec": 3664,
      "2025_Jan": 4161,
      "2025_Feb": 4152,
      "2025_Mar": 1454,
      "2025_Apr": 1241,
      "2025_May": 1051,
      "2025_Jun": 964
    },
    grandTotal: 16729
  }
]

export const monthLabels = [
  "2024_Jun", "2024_Jul", "2024_Aug", "2024_Sep", "2024_Oct", "2024_Nov",
  "2024_Dec", "2025_Jan", "2025_Feb", "2025_Mar", "2025_Apr", "2025_May", "2025_Jun"
]

export const monthDisplayNames = [
  "Jun 2024", "Jul 2024", "Aug 2024", "Sep 2024", "Oct 2024", "Nov 2024",
  "Dec 2024", "Jan 2025", "Feb 2025", "Mar 2025", "Apr 2025", "May 2025", "Jun 2025"
]