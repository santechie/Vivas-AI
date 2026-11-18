/**
 * Phase 2 Seed & Automated Verification Script
 * 1. Seeds 5 Indian Agri-Input Partners, Stores, Regulatory Licences, and 40 Products (with SKUs, Composition, Suitability, Claims).
 * 2. Runs the Phase 2 verification suite against backend/routes/partnerHub.js:
 *    - Test 1: Invalid GSTIN rejected (422)
 *    - Test 2: Register a partner (201)
 *    - Test 3: Product without approved licence blocked on submit (422)
 *    - Test 4: Upload FCO licence (with PDF magic byte validation, 201)
 *    - Test 5: SME approves FCO licence & partner (200)
 *    - Test 6: Submit & SME-approve product to 'live' (200)
 *    - Test 7: Verify pih_audit_log records
 */

import express from '../backend/node_modules/express/index.js';
import pool from '../backend/config/db.js';
import partnerHubRouter from '../backend/routes/partnerHub.js';
import partnerApiV1Router from '../backend/routes/partnerApiV1.js';
import crypto from 'crypto';

const PARTNERS_SEED = [
  {
    partner_code: 'PIH-PRT-0001',
    legal_name: 'Indian Farmers Fertiliser Cooperative Limited',
    brand_name: 'IFFCO Nano & Fertilisers',
    partner_type: 'NANO_FERTILISER',
    gstin: '07AAACI1234F1Z5',
    pan: 'AAACI1234F',
    address: 'IFFCO Sadan, C-1, District Centre, Saket Place',
    district: 'South Delhi',
    state: 'Delhi',
    pincode: '110017',
    phone: '9811011223',
    email: 'partner.nano@iffco.in',
    website: 'https://www.iffco.in',
    commission_pct: 4.5,
    store_slug: 'iffco-nano-store',
    about: 'Pioneering Nano-Urea & Nano-DAP for Sustainable Indian Agriculture',
    service_states: ['Karnataka', 'Maharashtra', 'Tamil Nadu', 'Andhra Pradesh', 'Telangana', 'Punjab', 'Uttar Pradesh', 'Gujarat'],
    licences: [
      { doc_type: 'FCO', doc_number: 'FCO/NANO/2021/IFFCO-001', issued_on: '2024-01-01', expires_on: '2028-12-31' },
      { doc_type: 'GST', doc_number: '07AAACI1234F1Z5', issued_on: '2017-07-01', expires_on: '2030-12-31' }
    ]
  },
  {
    partner_code: 'PIH-PRT-0002',
    legal_name: 'Multiplex Bio-Tech Private Limited',
    brand_name: 'Multiplex Agri-Inputs',
    partner_type: 'BIO_STIMULANT',
    gstin: '29AABCM4567G1Z2',
    pan: 'AABCM4567G',
    address: 'No. 180, 1st Main Road, Mahalakshmi Layout',
    district: 'Bengaluru Urban',
    state: 'Karnataka',
    pincode: '560086',
    phone: '9845022334',
    email: 'agronomy@multiplexgroup.com',
    website: 'https://www.multiplexgroup.com',
    commission_pct: 6.0,
    store_slug: 'multiplex-bio-organics',
    about: 'Micronutrients, Bio-Stimulants & Organic Crop Nutrition since 1974',
    service_states: ['Karnataka', 'Maharashtra', 'Tamil Nadu', 'Kerala', 'Andhra Pradesh', 'Telangana'],
    licences: [
      { doc_type: 'FCO', doc_number: 'KAR/FCO/MICRO/2022-889', issued_on: '2023-04-01', expires_on: '2028-03-31' },
      { doc_type: 'CIBRC', doc_number: 'CIR-1445/2021-BIO-MPX', issued_on: '2023-01-01', expires_on: '2028-12-31' },
      { doc_type: 'ORGANIC', doc_number: 'NPOP/NAB/ORG/2023-441', issued_on: '2023-06-01', expires_on: '2028-05-31' }
    ]
  },
  {
    partner_code: 'PIH-PRT-0003',
    legal_name: 'Syngenta India Private Limited',
    brand_name: 'Syngenta Crop Protection',
    partner_type: 'CROP_PROTECTION',
    gstin: '27AAACS8901H1Z9',
    pan: 'AAACS8901H',
    address: 'Amar Paradigm, Baner Road',
    district: 'Pune',
    state: 'Maharashtra',
    pincode: '411045',
    phone: '9822033445',
    email: 'digital.india@syngenta.com',
    website: 'https://www.syngenta.co.in',
    commission_pct: 5.5,
    store_slug: 'syngenta-crop-protection',
    about: 'Advanced Fungicides, Insecticides & Herbicides for High-Yield Farming',
    service_states: ['Maharashtra', 'Karnataka', 'Punjab', 'Haryana', 'Madhya Pradesh', 'Gujarat', 'Andhra Pradesh', 'Telangana'],
    licences: [
      { doc_type: 'CIBRC', doc_number: 'CIR-99210/2020-SYN-IND', issued_on: '2022-01-01', expires_on: '2029-12-31' },
      { doc_type: 'FCO', doc_number: 'FCO/BIOSTIM/2023/SYN-12', issued_on: '2023-01-01', expires_on: '2028-12-31' }
    ]
  },
  {
    partner_code: 'PIH-PRT-0004',
    legal_name: 'Namdhari Seeds Private Limited',
    brand_name: 'Namdhari Seeds',
    partner_type: 'SEED',
    gstin: '29AAACN3456K1Z4',
    pan: 'AAACN3456K',
    address: '119, 9th Main Road, Ideal Homes, Rajarajeshwari Nagar',
    district: 'Bengaluru Rural',
    state: 'Karnataka',
    pincode: '560098',
    phone: '9880144556',
    email: 'seeds.support@namdhariseeds.com',
    website: 'https://www.namdhariseeds.com',
    commission_pct: 5.0,
    store_slug: 'namdhari-seeds-official',
    about: 'High-Viability Hybrid Vegetable & Field Crop Seeds',
    service_states: ['Karnataka', 'Tamil Nadu', 'Maharashtra', 'Andhra Pradesh', 'Telangana', 'Gujarat'],
    licences: [
      { doc_type: 'SEED_LICENCE', doc_number: 'SEED/KAR/NOTIF/2021-772', issued_on: '2022-06-01', expires_on: '2028-05-31' }
    ]
  },
  {
    partner_code: 'PIH-PRT-0005',
    legal_name: 'Aries Agro Limited',
    brand_name: 'Aries Chelated Micronutrients',
    partner_type: 'MICRONUTRIENT',
    gstin: '27AAACA7654L1Z8',
    pan: 'AAACA7654L',
    address: 'Aries House, Plot No. 24, Deonar, Govandi East',
    district: 'Mumbai Suburban',
    state: 'Maharashtra',
    pincode: '400043',
    phone: '9820155667',
    email: 'chelated@ariesagro.com',
    website: 'https://www.ariesagro.com',
    commission_pct: 5.0,
    store_slug: 'aries-agro-micronutrients',
    about: 'EDTA Chelated Micronutrients & Water Soluble NPK Grades',
    service_states: ['Maharashtra', 'Karnataka', 'Gujarat', 'Madhya Pradesh', 'Uttar Pradesh', 'Punjab', 'Tamil Nadu'],
    licences: [
      { doc_type: 'FCO', doc_number: 'MAH/FCO/CHEL/2021-309', issued_on: '2022-01-01', expires_on: '2028-12-31' },
      { doc_type: 'ORGANIC', doc_number: 'NPOP/ARIES/2023-118', issued_on: '2023-01-01', expires_on: '2028-12-31' }
    ]
  }
];

// 40 realistic products across all 5 partners
const PRODUCTS_TEMPLATE = [
  // Partner 0: IFFCO (8 products)
  { pIdx: 0, code: 'IFFCO-NANO-UREA-500', name: 'IFFCO Nano Urea Liquid (4% N w/v)', type: 'NANO_FERTILISER', sub: 'Foliar Nano Nitrogen', form: 'Nano Suspension', reg: 'FCO/NANO/2021/IFFCO-001', hsn: '31021000', gst: 5, ing: 'Nano Nitrogen Particles', conc: 4.0, unit: '% w/v', nut: 'N', pack: 500, punit: 'ml', mrp: 225, price: 215, dose: 4, dunit: 'ml', basis: 'per litre', method: 'Foliar Spray', ctype: 'correct_deficiency' },
  { pIdx: 0, code: 'IFFCO-NANO-DAP-500', name: 'IFFCO Nano DAP Liquid (8% N, 16% P2O5)', type: 'NANO_FERTILISER', sub: 'Seed & Foliar Nano Phosphorus', form: 'Nano Suspension', reg: 'FCO/NANO/2021/IFFCO-001', hsn: '31053000', gst: 5, ing: 'Nano Di-Ammonium Phosphate', conc: 16.0, unit: '% w/v', nut: 'P', pack: 500, punit: 'ml', mrp: 600, price: 580, dose: 4, dunit: 'ml', basis: 'per litre', method: 'Foliar Spray', ctype: 'correct_deficiency' },
  { pIdx: 0, code: 'IFFCO-NANO-ZN-500', name: 'IFFCO Nano Zinc Colloidal Suspension', type: 'NANO_FERTILISER', sub: 'Nano Zinc 1%', form: 'Nano Suspension', reg: 'FCO/NANO/2021/IFFCO-001', hsn: '31059090', gst: 12, ing: 'Nano Zinc Oxide', conc: 1.0, unit: '% w/v', nut: 'Zn', pack: 500, punit: 'ml', mrp: 500, price: 465, dose: 2, dunit: 'ml', basis: 'per litre', method: 'Foliar Spray', ctype: 'correct_deficiency' },
  { pIdx: 0, code: 'IFFCO-NANO-CU-500', name: 'IFFCO Nano Copper Bio-Suspension', type: 'NANO_FERTILISER', sub: 'Nano Copper 0.8%', form: 'Nano Suspension', reg: 'FCO/NANO/2021/IFFCO-001', hsn: '31059090', gst: 12, ing: 'Nano Copper', conc: 0.8, unit: '% w/v', nut: 'Cu', pack: 500, punit: 'ml', mrp: 520, price: 480, dose: 2, dunit: 'ml', basis: 'per litre', method: 'Foliar Spray', ctype: 'correct_deficiency' },
  { pIdx: 0, code: 'IFFCO-UREA-NEEM-45KG', name: 'IFFCO Neem Coated Urea (46% Nitrogen)', type: 'UREA', sub: 'Prilled Neem Coated Urea', form: 'Prilled Granule', reg: 'FCO/NANO/2021/IFFCO-001', hsn: '31021000', gst: 5, ing: 'Total Nitrogen (Neem Coated)', conc: 46.0, unit: '% w/w', nut: 'N', pack: 45, punit: 'kg', mrp: 266.5, price: 266.5, dose: 45, dunit: 'kg', basis: 'per acre', method: 'Broadcast', ctype: 'correct_deficiency' },
  { pIdx: 0, code: 'IFFCO-NPK-19-19-19', name: 'IFFCO Water Soluble NPK 19:19:19', type: 'FERTILISER', sub: '100% Water Soluble NPK', form: 'Water Soluble Powder', reg: 'FCO/NANO/2021/IFFCO-001', hsn: '31052000', gst: 5, ing: 'Balanced N:P:K 19:19:19', conc: 57.0, unit: '% w/w', nut: 'N', pack: 1, punit: 'kg', mrp: 165, price: 148, dose: 5, dunit: 'g', basis: 'per litre', method: 'Fertigation', ctype: 'yield_boost' },
  { pIdx: 0, code: 'IFFCO-SAGARIKA-LIQ', name: 'IFFCO Sagarika Seaweed Extract (28% w/w)', type: 'BIO_STIMULANT', sub: 'Red & Brown Algae Extract', form: 'Liquid Concentrate', reg: 'FCO/NANO/2021/IFFCO-001', hsn: '31010099', gst: 12, ing: 'Kappaphycus & Sargassum Seaweed Extract', conc: 28.0, unit: '% w/w', nut: 'K', pack: 1, punit: 'L', mrp: 500, price: 460, dose: 2.5, dunit: 'ml', basis: 'per litre', method: 'Foliar Spray', ctype: 'yield_boost' },
  { pIdx: 0, code: 'IFFCO-NPK-00-52-34', name: 'IFFCO Mono Potassium Phosphate 00:52:34', type: 'FERTILISER', sub: 'Water Soluble PK', form: 'Water Soluble Powder', reg: 'FCO/NANO/2021/IFFCO-001', hsn: '31056000', gst: 5, ing: 'Phosphorus & Potassium (00:52:34)', conc: 52.0, unit: '% w/w', nut: 'P', pack: 1, punit: 'kg', mrp: 240, price: 215, dose: 5, dunit: 'g', basis: 'per litre', method: 'Fertigation', ctype: 'correct_deficiency' },

  // Partner 1: Multiplex (8 products)
  { pIdx: 1, code: 'MPX-KRANTI-LIQ-1L', name: 'Multiplex Kranti Complete Multi-Micronutrient', type: 'MICRONUTRIENT', sub: 'Liquid Multi-Micronutrient Mixture', form: 'Liquid', reg: 'KAR/FCO/MICRO/2022-889', hsn: '31059090', gst: 12, ing: 'Chelated Zn, Fe, Mn, B, Cu, Mo', conc: 9.5, unit: '% w/v', nut: 'Zn', pack: 1, punit: 'L', mrp: 680, price: 610, dose: 2.5, dunit: 'ml', basis: 'per litre', method: 'Foliar Spray', ctype: 'correct_deficiency' },
  { pIdx: 1, code: 'MPX-SAMRAS-BORON-20', name: 'Multiplex Solubor Di-Sodium Octaborate Tetrahydrate (20% B)', type: 'MICRONUTRIENT', sub: 'Water Soluble Boron 20%', form: 'Water Soluble Powder', reg: 'KAR/FCO/MICRO/2022-889', hsn: '28401900', gst: 12, ing: 'Boron (as B)', conc: 20.0, unit: '% w/w', nut: 'B', pack: 500, punit: 'g', mrp: 310, price: 275, dose: 1.5, dunit: 'g', basis: 'per litre', method: 'Foliar Spray', ctype: 'correct_deficiency' },
  { pIdx: 1, code: 'MPX-NISARGA-TRICHO', name: 'Multiplex Nisarga (Trichoderma viride 1.5% WP)', type: 'ORGANIC_INPUT', is_org: true, sub: 'Antagonistic Bio-Fungicide', form: 'Wettable Powder', reg: 'NPOP/NAB/ORG/2023-441', hsn: '38089290', gst: 12, ing: 'Trichoderma viride', conc: 200000, unit: 'CFU/g', nut: null, pack: 1, punit: 'kg', mrp: 340, price: 295, dose: 2, dunit: 'kg', basis: 'per acre', method: 'Soil Drench', ctype: 'prevent' },
  { pIdx: 1, code: 'MPX-SPARSHA-PSEUDO', name: 'Multiplex Sparsha (Pseudomonas fluorescens 1.0% WP)', type: 'ORGANIC_INPUT', is_org: true, sub: 'Bactericidal & Fungicidal Bio-Agent', form: 'Wettable Powder', reg: 'NPOP/NAB/ORG/2023-441', hsn: '38089290', gst: 12, ing: 'Pseudomonas fluorescens', conc: 500000, unit: 'CFU/g', nut: null, pack: 1, punit: 'kg', mrp: 360, price: 315, dose: 5, dunit: 'g', basis: 'per litre', method: 'Foliar Spray', ctype: 'control' },
  { pIdx: 1, code: 'MPX-AZOTOBACTER-1L', name: 'Multiplex Azotobacter Liquid Bio-Fertiliser', type: 'ORGANIC_INPUT', is_org: true, sub: 'Nitrogen Fixing Consortia', form: 'Liquid', reg: 'NPOP/NAB/ORG/2023-441', hsn: '31010099', gst: 5, ing: 'Azotobacter chroococcum', conc: 500000, unit: 'CFU/g', nut: 'N', pack: 1, punit: 'L', mrp: 420, price: 375, dose: 1, dunit: 'L', basis: 'per acre', method: 'Soil Drench', ctype: 'correct_deficiency' },
  { pIdx: 1, code: 'MPX-PSB-LIQ-1L', name: 'Multiplex Siddhi Phosphate Solubilising Bacteria (PSB)', type: 'ORGANIC_INPUT', is_org: true, sub: 'Phosphate Solubiliser', form: 'Liquid', reg: 'NPOP/NAB/ORG/2023-441', hsn: '31010099', gst: 5, ing: 'Bacillus megaterium', conc: 500000, unit: 'CFU/g', nut: 'P', pack: 1, punit: 'L', mrp: 420, price: 375, dose: 1, dunit: 'L', basis: 'per acre', method: 'Soil Drench', ctype: 'correct_deficiency' },
  { pIdx: 1, code: 'MPX-HUMIC-GOLD-1L', name: 'Multiplex Humic Gold (Humic + Fulvic Acid 18%)', type: 'BIO_STIMULANT', sub: 'Organic Soil & Root Conditioner', form: 'Liquid', reg: 'KAR/FCO/MICRO/2022-889', hsn: '31010099', gst: 12, ing: 'Potassium Humate & Fulvic Acid', conc: 18.0, unit: '% w/v', nut: 'K', pack: 1, punit: 'L', mrp: 580, price: 510, dose: 2, dunit: 'ml', basis: 'per litre', method: 'Soil Drench', ctype: 'yield_boost' },
  { pIdx: 1, code: 'MPX-CALCIUM-BORON-1L', name: 'Multiplex Chelated Calcium-Boron Liquid', type: 'MICRONUTRIENT', sub: 'Blossom End Rot & Cracking Shield', form: 'Liquid', reg: 'KAR/FCO/MICRO/2022-889', hsn: '31059090', gst: 12, ing: 'Chelated Calcium 11% + Boron 1.5%', conc: 11.0, unit: '% w/v', nut: 'Ca', pack: 1, punit: 'L', mrp: 640, price: 575, dose: 2, dunit: 'ml', basis: 'per litre', method: 'Foliar Spray', ctype: 'correct_deficiency' },

  // Partner 2: Syngenta India (8 products)
  { pIdx: 2, code: 'SYN-AMISTAR-TOP-200', name: 'Syngenta Amistar Top (Azoxystrobin 18.2% + Difenoconazole 11.4% SC)', type: 'CROP_PROTECTION', sub: 'Broad-Spectrum Systemic Fungicide', form: 'Suspension Concentrate', reg: 'CIR-99210/2020-SYN-IND', hsn: '38089290', gst: 18, ing: 'Azoxystrobin + Difenoconazole', conc: 29.6, unit: '% w/w', nut: null, pack: 200, punit: 'ml', mrp: 1150, price: 1020, dose: 1, dunit: 'ml', basis: 'per litre', method: 'Foliar Spray', ctype: 'cure' },
  { pIdx: 2, code: 'SYN-RIDOMIL-GOLD-250', name: 'Syngenta Ridomil Gold (Metalaxyl-M 4% + Mancozeb 64% WP)', type: 'CROP_PROTECTION', sub: 'Late Blight & Downy Mildew Specialist', form: 'Wettable Powder', reg: 'CIR-99210/2020-SYN-IND', hsn: '38089290', gst: 18, ing: 'Metalaxyl-M + Mancozeb', conc: 68.0, unit: '% w/w', nut: null, pack: 250, punit: 'g', mrp: 690, price: 615, dose: 2, dunit: 'g', basis: 'per litre', method: 'Foliar Spray', ctype: 'cure' },
  { pIdx: 2, code: 'SYN-ACTARA-25WG-100', name: 'Syngenta Actara (Thiamethoxam 25% WG)', type: 'CROP_PROTECTION', sub: 'Systemic Sucking Pest Insecticide', form: 'Water Dispersible Granule', reg: 'CIR-99210/2020-SYN-IND', hsn: '38089199', gst: 18, ing: 'Thiamethoxam 25% WG', conc: 25.0, unit: '% w/w', nut: null, pack: 100, punit: 'g', mrp: 380, price: 335, dose: 0.5, dunit: 'g', basis: 'per litre', method: 'Foliar Spray', ctype: 'control' },
  { pIdx: 2, code: 'SYN-AMPLIGO-100ML', name: 'Syngenta Ampligo (Chlorantraniliprole 10% + Lambda-cyhalothrin 5% ZC)', type: 'CROP_PROTECTION', sub: 'Lepidopteran Borer Control', form: 'Suspension Concentrate', reg: 'CIR-99210/2020-SYN-IND', hsn: '38089199', gst: 18, ing: 'Chlorantraniliprole + Lambda-cyhalothrin', conc: 15.0, unit: '% w/v', nut: null, pack: 100, punit: 'ml', mrp: 980, price: 875, dose: 0.5, dunit: 'ml', basis: 'per litre', method: 'Foliar Spray', ctype: 'control' },
  { pIdx: 2, code: 'SYN-PEGASUS-250G', name: 'Syngenta Pegasus (Diafenthiuron 50% WP)', type: 'CROP_PROTECTION', sub: 'Whitefly, Thrips & Mite Control', form: 'Wettable Powder', reg: 'CIR-99210/2020-SYN-IND', hsn: '38089199', gst: 18, ing: 'Diafenthiuron 50% WP', conc: 50.0, unit: '% w/w', nut: null, pack: 250, punit: 'g', mrp: 1120, price: 990, dose: 1, dunit: 'g', basis: 'per litre', method: 'Foliar Spray', ctype: 'control' },
  { pIdx: 2, code: 'SYN-KAVACH-500G', name: 'Syngenta Kavach (Chlorothalonil 75% WP)', type: 'CROP_PROTECTION', sub: 'Multi-Site Contact Fungicide', form: 'Wettable Powder', reg: 'CIR-99210/2020-SYN-IND', hsn: '38089290', gst: 18, ing: 'Chlorothalonil 75% WP', conc: 75.0, unit: '% w/w', nut: null, pack: 500, punit: 'g', mrp: 860, price: 775, dose: 2, dunit: 'g', basis: 'per litre', method: 'Foliar Spray', ctype: 'prevent' },
  { pIdx: 2, code: 'SYN-QUANTIS-BIO-400', name: 'Syngenta Quantis Abiotic Stress Bio-Stimulant', type: 'BIO_STIMULANT', sub: 'Amino Acid & Organic Carbon Bio-Stimulant', form: 'Liquid', reg: 'FCO/BIOSTIM/2023/SYN-12', hsn: '31010099', gst: 12, ing: 'Organic Carbon 15% + Amino Acids 2%', conc: 17.0, unit: '% w/w', nut: 'K', pack: 400, punit: 'ml', mrp: 720, price: 645, dose: 2, dunit: 'ml', basis: 'per litre', method: 'Foliar Spray', ctype: 'yield_boost' },
  { pIdx: 2, code: 'SYN-ISABION-250ML', name: 'Syngenta Isabion Flowering & Fruit Set Enhancer', type: 'BIO_STIMULANT', sub: 'Free Amino Acids & Peptides (62.5%)', form: 'Liquid', reg: 'FCO/BIOSTIM/2023/SYN-12', hsn: '31010099', gst: 12, ing: 'Free Amino Acids & Short Chain Peptides', conc: 62.5, unit: '% w/w', nut: 'N', pack: 250, punit: 'ml', mrp: 540, price: 485, dose: 2, dunit: 'ml', basis: 'per litre', method: 'Foliar Spray', ctype: 'yield_boost' },

  // Partner 3: Namdhari Seeds (8 products)
  { pIdx: 3, code: 'NS-TOMATO-NS501-10G', name: 'Namdhari Hybrid Tomato NS-501 (ToLCV & Bacterial Wilt Tolerant)', type: 'SEED', sub: 'Determinate F1 Hybrid Tomato', form: 'Coated Seed', reg: 'SEED/KAR/NOTIF/2021-772', hsn: '12099160', gst: 0, ing: 'Treated F1 Hybrid Tomato Seed (Min 90% Germination)', conc: 99.0, unit: '% w/w', nut: null, pack: 10, punit: 'g', mrp: 650, price: 590, dose: 60, dunit: 'g', basis: 'per acre', method: 'Nursery Sowing', ctype: 'prevent' },
  { pIdx: 3, code: 'NS-CHILLI-NS1701-10G', name: 'Namdhari Hybrid Hot Pepper NS-1701 (Leaf Curl Tolerant)', type: 'SEED', sub: 'Dual Purpose Green & Red Chilli F1', form: 'Coated Seed', reg: 'SEED/KAR/NOTIF/2021-772', hsn: '12099190', gst: 0, ing: 'F1 Hybrid Capsicum annuum Seed', conc: 99.0, unit: '% w/w', nut: null, pack: 10, punit: 'g', mrp: 580, price: 525, dose: 80, dunit: 'g', basis: 'per acre', method: 'Nursery Sowing', ctype: 'prevent' },
  { pIdx: 3, code: 'NS-WATERMELON-NS295', name: 'Namdhari Hybrid Watermelon NS-295 Icebox Sugar Baby', type: 'SEED', sub: 'High TSS Early Hybrid Watermelon', form: 'Coated Seed', reg: 'SEED/KAR/NOTIF/2021-772', hsn: '12099990', gst: 0, ing: 'F1 Hybrid Citrullus lanatus Seed', conc: 99.0, unit: '% w/w', nut: null, pack: 50, punit: 'g', mrp: 1450, price: 1320, dose: 300, dunit: 'g', basis: 'per acre', method: 'Direct Dibbling', ctype: 'yield_boost' },
  { pIdx: 3, code: 'NS-OKRA-NS801-250G', name: 'Namdhari Hybrid Bhindi NS-801 (YVMV Resistant)', type: 'SEED', sub: 'Yellow Vein Mosaic Resistant Okra', form: 'Coated Seed', reg: 'SEED/KAR/NOTIF/2021-772', hsn: '12099190', gst: 0, ing: 'F1 Hybrid Abelmoschus esculentus Seed', conc: 99.0, unit: '% w/w', nut: null, pack: 250, punit: 'g', mrp: 890, price: 810, dose: 2, dunit: 'kg', basis: 'per acre', method: 'Direct Sowing', ctype: 'prevent' },
  { pIdx: 3, code: 'NS-CAULIFLOWER-NS60N', name: 'Namdhari Hybrid Cauliflower NS-60N Tropical Early', type: 'SEED', sub: 'Heat Tolerant Curd Cauliflower', form: 'Coated Seed', reg: 'SEED/KAR/NOTIF/2021-772', hsn: '12099110', gst: 0, ing: 'F1 Hybrid Brassica oleracea Seed', conc: 99.0, unit: '% w/w', nut: null, pack: 10, punit: 'g', mrp: 520, price: 470, dose: 100, dunit: 'g', basis: 'per acre', method: 'Nursery Sowing', ctype: 'yield_boost' },
  { pIdx: 3, code: 'NS-CUCUMBER-NS404', name: 'Namdhari Hybrid Cucumber NS-404 Downy Mildew Tolerant', type: 'SEED', sub: 'Slicing Green Cucumber F1', form: 'Coated Seed', reg: 'SEED/KAR/NOTIF/2021-772', hsn: '12099190', gst: 0, ing: 'F1 Hybrid Cucumis sativus Seed', conc: 99.0, unit: '% w/w', nut: null, pack: 10, punit: 'g', mrp: 410, price: 375, dose: 250, dunit: 'g', basis: 'per acre', method: 'Direct Sowing', ctype: 'prevent' },
  { pIdx: 3, code: 'NS-ONION-RED-NS92', name: 'Namdhari Red Onion Kharif & Rabi Selection NS-92', type: 'SEED', sub: 'High Bulb Storage Onion', form: 'Coated Seed', reg: 'SEED/KAR/NOTIF/2021-772', hsn: '12099130', gst: 0, ing: 'Certified Onion Seed', conc: 98.5, unit: '% w/w', nut: null, pack: 500, punit: 'g', mrp: 1280, price: 1160, dose: 3, dunit: 'kg', basis: 'per acre', method: 'Nursery Sowing', ctype: 'yield_boost' },
  { pIdx: 3, code: 'NS-MAIZE-SWEET-NS75', name: 'Namdhari Super Sweet Corn Hybrid NS-75 (Brix 16%)', type: 'SEED', sub: 'Golden Sweet Corn F1', form: 'Coated Seed', reg: 'SEED/KAR/NOTIF/2021-772', hsn: '10051000', gst: 0, ing: 'F1 Hybrid Sweet Corn Seed', conc: 99.0, unit: '% w/w', nut: null, pack: 500, punit: 'g', mrp: 1550, price: 1410, dose: 3, dunit: 'kg', basis: 'per acre', method: 'Direct Sowing', ctype: 'yield_boost' },

  // Partner 4: Aries Agro (8 products)
  { pIdx: 4, code: 'ARIES-AGROMIN-MAX-500', name: 'Aries Agromin Max Water Soluble Chelated Micronutrient Mix', type: 'MICRONUTRIENT', sub: 'EDTA Chelated Fe, Mn, Zn, Cu + B, Mo', form: 'Water Soluble Powder', reg: 'MAH/FCO/CHEL/2021-309', hsn: '31059090', gst: 12, ing: 'EDTA Chelated Multi-Micronutrients', conc: 14.5, unit: '% w/w', nut: 'Zn', pack: 500, punit: 'g', mrp: 495, price: 440, dose: 1.5, dunit: 'g', basis: 'per litre', method: 'Foliar Spray', ctype: 'correct_deficiency' },
  { pIdx: 4, code: 'ARIES-CHELAMIN-ZN-250', name: 'Aries Chelamin Plus (EDTA Chelated Zinc 12%)', type: 'MICRONUTRIENT', sub: 'FCO Grade Chelated Zinc 12%', form: 'Water Soluble Powder', reg: 'MAH/FCO/CHEL/2021-309', hsn: '31059090', gst: 12, ing: 'Chelated Zinc as Zn-EDTA', conc: 12.0, unit: '% w/w', nut: 'Zn', pack: 250, punit: 'g', mrp: 290, price: 255, dose: 1, dunit: 'g', basis: 'per litre', method: 'Foliar Spray', ctype: 'correct_deficiency' },
  { pIdx: 4, code: 'ARIES-CHELAFER-FE-250', name: 'Aries Chelafer (EDTA Chelated Iron 12% Fe)', type: 'MICRONUTRIENT', sub: 'Interveinal Chlorosis Corrector', form: 'Water Soluble Powder', reg: 'MAH/FCO/CHEL/2021-309', hsn: '31059090', gst: 12, ing: 'Chelated Iron as Fe-EDTA', conc: 12.0, unit: '% w/w', nut: 'Fe', pack: 250, punit: 'g', mrp: 310, price: 270, dose: 1, dunit: 'g', basis: 'per litre', method: 'Foliar Spray', ctype: 'correct_deficiency' },
  { pIdx: 4, code: 'ARIES-MAGMIX-1KG', name: 'Aries Magmix Magnesium Sulphate Heptahydrate (9.5% Mg, 12% S)', type: 'FERTILISER', sub: 'Secondary Nutrient Mg + S', form: 'Water Soluble Powder', reg: 'MAH/FCO/CHEL/2021-309', hsn: '28332100', gst: 12, ing: 'Magnesium 9.5% + Sulphur 12%', conc: 9.5, unit: '% w/w', nut: 'Mg', pack: 1, punit: 'kg', mrp: 120, price: 98, dose: 5, dunit: 'g', basis: 'per litre', method: 'Foliar Spray', ctype: 'correct_deficiency' },
  { pIdx: 4, code: 'ARIES-CAN-CALNIT-1KG', name: 'Aries Water Soluble Calcium Nitrate (15.5% N, 18.8% Ca)', type: 'FERTILISER', sub: 'Fruit Firmness & Root Growth Grade', form: 'Granule', reg: 'MAH/FCO/CHEL/2021-309', hsn: '31026000', gst: 12, ing: 'Water Soluble Calcium 18.8%', conc: 18.8, unit: '% w/w', nut: 'Ca', pack: 1, punit: 'kg', mrp: 135, price: 115, dose: 5, dunit: 'g', basis: 'per litre', method: 'Fertigation', ctype: 'correct_deficiency' },
  { pIdx: 4, code: 'ARIES-FERTISOL-13-00-45', name: 'Aries Fertisol Potassium Nitrate 13:00:45', type: 'FERTILISER', sub: 'Fruit Development & Colour Booster', form: 'Water Soluble Powder', reg: 'MAH/FCO/CHEL/2021-309', hsn: '28342100', gst: 12, ing: 'Potassium (as K2O 45%) + Nitrate-N 13%', conc: 45.0, unit: '% w/w', nut: 'K', pack: 1, punit: 'kg', mrp: 220, price: 195, dose: 5, dunit: 'g', basis: 'per litre', method: 'Foliar Spray', ctype: 'yield_boost' },
  { pIdx: 4, code: 'ARIES-SILICON-SPREAD-250', name: 'Aries Silico-Spread Non-Ionic Organosilicone Wetting Agent', type: 'OTHER', sub: 'Super Spreader & Sticker Adjuvant', form: 'Liquid', reg: 'MAH/FCO/CHEL/2021-309', hsn: '34021300', gst: 18, ing: 'Trisiloxane Ethoxylate 80%', conc: 80.0, unit: '% w/v', nut: null, pack: 250, punit: 'ml', mrp: 360, price: 315, dose: 0.3, dunit: 'ml', basis: 'per litre', method: 'Foliar Spray', ctype: 'control' },
  { pIdx: 4, code: 'ARIES-SULPHUR-BENT-5KG', name: 'Aries Bentonite Sulphur 90% Pastilles', type: 'ORGANIC_INPUT', is_org: true, sub: 'Elemental Sulphur & Soil pH Conditioner', form: 'Granule', reg: 'NPOP/ARIES/2023-118', hsn: '25030090', gst: 12, ing: 'Elemental Sulphur 90% + Bentonite Clay 10%', conc: 90.0, unit: '% w/w', nut: 'S', pack: 5, punit: 'kg', mrp: 480, price: 425, dose: 10, dunit: 'kg', basis: 'per acre', method: 'Broadcast', ctype: 'correct_deficiency' }
];

async function seedPhase2Data() {
  console.log('--- Seeding Phase 2 Data (5 Indian Partners, Licences, Stores, 40 Products) ---');

  const cropsRes = await pool.query('SELECT id, name FROM vivas_crops ORDER BY name ASC LIMIT 10');
  const usersRes = await pool.query('SELECT id FROM vivas_users ORDER BY created_at ASC LIMIT 1');
  const reviewerId = usersRes.rows[0]?.id || null;

  // Ensure canonical Crop Health problems exist in ch_problem for product claims
  const DEFAULT_PROBLEMS = [
    { code: 'DEF-0001', type: 'DEFICIENCY', name: 'Nitrogen (N) Deficiency Chlorosis', nut: 'N', sev: 'HIGH' },
    { code: 'DEF-0002', type: 'DEFICIENCY', name: 'Phosphorus (P) Deficiency Purpling', nut: 'P', sev: 'MODERATE' },
    { code: 'DEF-0003', type: 'DEFICIENCY', name: 'Potassium (K) Marginal Leaf Scorch', nut: 'K', sev: 'MODERATE' },
    { code: 'DEF-0004', type: 'DEFICIENCY', name: 'Zinc (Zn) Little Leaf & Rosetting', nut: 'Zn', sev: 'HIGH' },
    { code: 'DEF-0005', type: 'DEFICIENCY', name: 'Boron (B) Fruit Cracking & Hollow Stem', nut: 'B', sev: 'MODERATE' },
    { code: 'DEF-0006', type: 'DEFICIENCY', name: 'Iron (Fe) Interveinal Chlorosis', nut: 'Fe', sev: 'MODERATE' },
    { code: 'DEF-0007', type: 'DEFICIENCY', name: 'Calcium (Ca) Blossom End Rot', nut: 'Ca', sev: 'HIGH' },
    { code: 'DIS-0001', type: 'DISEASE', name: 'Late Blight & Downy Mildew (Phytophthora)', nut: null, sev: 'SEVERE' },
    { code: 'DIS-0002', type: 'DISEASE', name: 'Powdery Mildew & Anthracnose Fruit Rot', nut: null, sev: 'HIGH' },
    { code: 'PST-0001', type: 'PEST', name: 'Whitefly, Thrips & Aphid Sucking Complex', nut: null, sev: 'HIGH' },
    { code: 'PST-0002', type: 'PEST', name: 'Helicoverpa Fruit & Shoot Borer', nut: null, sev: 'SEVERE' }
  ];

  for (const dp of DEFAULT_PROBLEMS) {
    await pool.query(
      `INSERT INTO ch_problem (
         problem_type, code, name, nutrient_code, potential_severity, scope, status, created_by
       ) VALUES ($1,$2,$3,$4,$5,'GLOBAL','PUBLISHED',$6)
       ON CONFLICT (code) DO NOTHING`,
      [dp.type, dp.code, dp.name, dp.nut, dp.sev, reviewerId]
    );
  }

  const problemsRes = await pool.query('SELECT id, code, name, problem_type, nutrient_code FROM ch_problem ORDER BY code ASC');
  const crops = cropsRes.rows;
  const problems = problemsRes.rows;

  const partnerIds = [];

  for (const p of PARTNERS_SEED) {
    const existing = await pool.query('SELECT id FROM pih_partners WHERE gstin = $1 AND deleted_at IS NULL', [p.gstin]);
    let partnerId;
    if (existing.rows.length > 0) {
      partnerId = existing.rows[0].id;
      await pool.query(
        `UPDATE pih_partners SET
           legal_name = $1, brand_name = $2, partner_type = $3, pan = $4,
           address = $5, district = $6, state = $7, pincode = $8,
           phone = $9, email = $10, website = $11,
           status = 'approved', verified_by = $12, verified_at = NOW(), commission_pct = $13
         WHERE id = $14`,
        [
          p.legal_name, p.brand_name, p.partner_type, p.pan,
          p.address, p.district, p.state, p.pincode,
          p.phone, p.email, p.website,
          reviewerId, p.commission_pct, partnerId
        ]
      );
    } else {
      const ins = await pool.query(
        `INSERT INTO pih_partners (
           partner_code, legal_name, brand_name, partner_type, gstin, pan,
           address, district, state, pincode, phone, email, website,
           status, verified_by, verified_at, commission_pct
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'approved',$14,NOW(),$15)
         RETURNING id`,
        [
          p.partner_code, p.legal_name, p.brand_name, p.partner_type, p.gstin, p.pan,
          p.address, p.district, p.state, p.pincode, p.phone, p.email, p.website,
          reviewerId, p.commission_pct
        ]
      );
      partnerId = ins.rows[0].id;
    }
    partnerIds.push(partnerId);

    // Upsert Store
    await pool.query(
      `INSERT INTO pih_stores (
         partner_id, store_name, slug, about, service_states, service_districts,
         support_phone, support_email, return_policy, min_order_value, cod_enabled, credit_enabled, is_live
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'7-day replacement for damaged sealed packs',250,TRUE,FALSE,TRUE)
       ON CONFLICT (partner_id) DO UPDATE SET
         store_name = EXCLUDED.store_name,
         about = EXCLUDED.about,
         service_states = EXCLUDED.service_states,
         is_live = TRUE`,
      [
        partnerId, `${p.brand_name} Official Store`, p.store_slug, p.about,
        p.service_states, [p.district], p.phone, p.email
      ]
    );

    // Upsert Licences
    for (const lic of p.licences) {
      const existingDoc = await pool.query(
        'SELECT id FROM pih_partner_documents WHERE partner_id = $1 AND doc_type = $2 AND doc_number = $3 AND deleted_at IS NULL',
        [partnerId, lic.doc_type, lic.doc_number]
      );
      if (existingDoc.rows.length === 0) {
        await pool.query(
          `INSERT INTO pih_partner_documents (
             partner_id, doc_type, doc_number, issued_on, expires_on, file_url,
             review_status, reviewed_by, reviewed_at, remarks
           ) VALUES ($1,$2,$3,$4,$5,$6,'approved',$7,NOW(),'Verified against official regulatory registry by Vivas SME')`,
          [
            partnerId, lic.doc_type, lic.doc_number, lic.issued_on, lic.expires_on,
            `/uploads/partner_hub/${lic.doc_type.toLowerCase()}_${partnerId.slice(0, 8)}.pdf`,
            reviewerId
          ]
        );
      } else {
        await pool.query(
          `UPDATE pih_partner_documents SET review_status = 'approved', expires_on = $1 WHERE id = $2`,
          [lic.expires_on, existingDoc.rows[0].id]
        );
      }
    }
  }

  // Upsert 40 Products
  let seededProducts = 0;
  for (let i = 0; i < PRODUCTS_TEMPLATE.length; i++) {
    const item = PRODUCTS_TEMPLATE[i];
    const partnerId = partnerIds[item.pIdx];

    const existingProd = await pool.query(
      'SELECT id FROM pih_products WHERE product_code = $1 AND deleted_at IS NULL',
      [item.code]
    );

    let productId;
    if (existingProd.rows.length > 0) {
      productId = existingProd.rows[0].id;
      await pool.query(`UPDATE pih_products SET status = 'live' WHERE id = $1`, [productId]);
    } else {
      const pIns = await pool.query(
        `INSERT INTO pih_products (
           partner_id, product_code, name, brand, product_type, sub_type,
           formulation, registration_no, hsn_code, gst_pct, is_organic,
           shelf_life_months, phi_days, reentry_hours,
           description, how_it_works, status, approved_by, approved_at
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,24,7,12,$12,$13,'live',$14,NOW()
         ) RETURNING id`,
        [
          partnerId, item.code, item.name, PARTNERS_SEED[item.pIdx].brand_name,
          item.type, item.sub, item.form, item.reg, item.hsn, item.gst,
          Boolean(item.is_org),
          `${item.name} — ${item.sub}. Verified for field performance on Vivas AI.`,
          `Provides targeted ${item.ing} action via ${item.method}.`,
          reviewerId
        ]
      );
      productId = pIns.rows[0].id;

      // Add SKU
      await pool.query(
        `INSERT INTO pih_product_skus (
           product_id, sku_code, pack_size, pack_unit, mrp, selling_price,
           stock_qty, batch_no, mfg_date, expiry_date, is_active
         ) VALUES ($1,$2,$3,$4,$5,$6,250,$7,'2026-01-15','2028-01-14',TRUE)
         ON CONFLICT (sku_code) DO NOTHING`,
        [
          productId, `${item.code}-SKU1`, item.pack, item.punit,
          item.mrp, item.price, `BATCH-${202600 + i}`
        ]
      );

      // Add Composition
      await pool.query(
        `INSERT INTO pih_product_composition (
           product_id, component_name, nutrient_code, active_ingredient, value, unit, seq
         ) VALUES ($1,$2,$3,$4,$5,$6,1)`,
        [productId, item.ing, item.nut, item.ing, item.conc, item.unit]
      );

      // Add Crop Suitability (link first 2 crops)
      for (let cIdx = 0; cIdx < Math.min(2, crops.length); cIdx++) {
        const crop = crops[(i + cIdx) % crops.length];
        await pool.query(
          `INSERT INTO pih_product_crop_suitability (
             product_id, crop_id, crop_stage, dose_value, dose_unit, dose_basis,
             application_method, interval_days, max_applications
           ) VALUES ($1,$2,'Vegetative to Flowering',$3,$4,$5,$6,14,3)`,
          [productId, crop.id, item.dose, item.dunit, item.basis, item.method]
        );
      }

      // Initialize rating row
      await pool.query(
        `INSERT INTO pih_product_ratings (product_id, crop_id, fps, raw_score, verified_count, farm_count, badge)
         VALUES ($1, NULL, 0, 0, 0, 0, 'needs_data')`,
        [productId]
      );
    }

    // Ensure Problem Claim exists for every seeded product
    if (problems.length > 0) {
      const existingClaim = await pool.query(
        'SELECT id FROM pih_product_claims WHERE product_id = $1 AND deleted_at IS NULL LIMIT 1',
        [productId]
      );
      if (existingClaim.rows.length === 0) {
        let matchedProb = problems[i % problems.length];
        if (item.nut) {
          const defProb = problems.find(pr => pr.problem_type === 'DEFICIENCY' && pr.nutrient_code === item.nut);
          if (defProb) matchedProb = defProb;
        }
        await pool.query(
          `INSERT INTO pih_product_claims (
             product_id, problem_id, crop_id, claim_type, evidence_note,
             sme_status, sme_by, sme_at, sme_remarks
           ) VALUES ($1,$2,$3,$4,$5,'verified',$6,NOW(),'Verified by Vivas Agronomy SME')`,
          [
            productId, matchedProb.id, crops[i % crops.length]?.id || null,
            item.ctype, `Recommended ${item.dose} ${item.dunit} ${item.basis} via ${item.method}`,
            reviewerId
          ]
        );
      }
    }
    seededProducts++;
  }

  console.log(`Seeded ${partnerIds.length} partners and ${seededProducts} live products.`);
}

async function runPhase2VerificationSuite() {
  console.log('\n--- Running Phase 2 Automated Verification Suite ---');
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use('/api/pih', partnerHubRouter);
  app.use('/api/pih/v1', partnerApiV1Router);

  const server = await new Promise(resolve => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/pih`;

  const req = async (path, method = 'GET', body = null, role = 'partner_admin') => {
    const headers = {
      'Content-Type': 'application/json',
      'x-pih-role': role
    };
    if (method === 'POST') {
      headers['Idempotency-Key'] = crypto.randomUUID();
    }
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
    const json = await res.json();
    return { status: res.status, body: json };
  };

  try {
    // Clean up any prior test run partner with GSTIN 29AAACT9999M1Z5
    await pool.query(`DELETE FROM pih_partners WHERE gstin = '29AAACT9999M1Z5'`);

    const cropsRes = await pool.query('SELECT id FROM vivas_crops LIMIT 1');
    const probRes = await pool.query('SELECT id FROM ch_problem LIMIT 1');
    const sampleCropId = cropsRes.rows[0].id;
    const sampleProblemId = probRes.rows[0].id;

    // TEST 1: Reject Invalid GSTIN (422)
    const t1 = await req('/partners', 'POST', {
      legal_name: 'Invalid GSTIN Test Co',
      brand_name: 'BadGST',
      partner_type: 'FERTILISER',
      gstin: 'INVALID-GST-123',
      pan: 'AAACT9999M',
      address: 'Test Plot 1',
      district: 'Bengaluru Urban',
      state: 'Karnataka',
      pincode: '560001',
      phone: '9876543210',
      email: 'bad@example.com'
    });
    if (t1.status !== 422) {
      throw new Error(`Test 1 Failed: Expected 422 for invalid GSTIN, got ${t1.status}`);
    }
    console.log('✓ Test 1 Passed: Invalid GSTIN rejected with HTTP 422 and field-level error:', JSON.stringify(t1.body.errors));

    // TEST 2: Register a Valid Partner (201)
    const t2 = await req('/partners', 'POST', {
      legal_name: 'Coromandel Agritech Test Pvt Ltd',
      brand_name: 'Coromandel NutriScience',
      partner_type: 'NANO_FERTILISER',
      gstin: '29AAACT9999M1Z5',
      pan: 'AAACT9999M',
      address: 'Coromandel House, MG Road',
      district: 'Bengaluru Urban',
      state: 'Karnataka',
      pincode: '560001',
      phone: '9845099887',
      email: 'anand@coromandel-test.in',
      website: 'https://www.coromandel.biz'
    });
    if (t2.status !== 201 || !t2.body.data?.id) {
      throw new Error(`Test 2 Failed: Expected 201 for partner registration, got ${t2.status}: ${JSON.stringify(t2.body)}`);
    }
    const testPartner = t2.body.data;
    const testPartnerId = testPartner.id;
    console.log(`✓ Test 2 Passed: Registered partner '${testPartner.brand_name}' (id=${testPartnerId}, status=${testPartner.status})`);

    // TEST 3: Create a Nano-Fertiliser Product and verify submitting it WITHOUT an approved FCO licence is BLOCKED (422)
    const prodCreate = await req('/products', 'POST', {
      partner_id: testPartnerId,
      product_code: 'CORO-NANO-TEST-01',
      name: 'Coromandel Nano Potash 10%',
      brand: 'Coromandel NutriScience',
      product_type: 'NANO_FERTILISER',
      sub_type: 'Nano Potash',
      formulation: 'Nano Suspension',
      registration_no: 'FCO/KAR/2026-999',
      hsn_code: '31059090',
      gst_pct: 12,
      skus: [{
        sku_code: 'CORO-NANO-01-500ML',
        pack_size: 500,
        pack_unit: 'ml',
        mrp: 450,
        selling_price: 399,
        stock_qty: 100
      }],
      composition: [{
        component_name: 'Nano Potassium',
        nutrient_code: 'K',
        active_ingredient: 'Nano K',
        value: 10,
        unit: '% w/v'
      }],
      suitability: [{
        crop_id: sampleCropId,
        crop_stage: 'Flowering',
        dose_value: 3,
        dose_unit: 'ml',
        dose_basis: 'per litre',
        application_method: 'Foliar Spray'
      }],
      claims: [{
        problem_id: sampleProblemId,
        crop_id: sampleCropId,
        claim_type: 'correct_deficiency',
        evidence_note: 'Field trial verified'
      }]
    });
    if (prodCreate.status !== 201) {
      throw new Error(`Failed to create draft product: ${JSON.stringify(prodCreate.body)}`);
    }
    const testProductId = prodCreate.body.data.id;

    const blockedSubmit = await req(`/products/${testProductId}/submit`, 'POST', {});
    if (blockedSubmit.status !== 422) {
      throw new Error(`Test 3 Failed: Expected 422 when submitting product without approved FCO licence, got ${blockedSubmit.status}`);
    }
    console.log('✓ Test 3 Passed: Product submission without approved FCO licence blocked with HTTP 422:', JSON.stringify(blockedSubmit.body.errors));

    // TEST 4: Upload an FCO Licence (with real PDF magic bytes %PDF-1.4)
    const pdfBase64 = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF').toString('base64');
    const docUpload = await req(`/partners/${testPartnerId}/documents`, 'POST', {
      doc_type: 'FCO',
      doc_number: 'FCO/KAR/2026-999',
      issued_on: '2025-01-01',
      expires_on: '2029-12-31',
      file_name: 'fco_licence.pdf',
      file_data: pdfBase64
    });
    if (docUpload.status !== 201) {
      throw new Error(`Test 4 Failed: Expected 201 for FCO licence upload, got ${docUpload.status}: ${JSON.stringify(docUpload.body)}`);
    }
    const testDocId = docUpload.body.data.id;
    console.log(`✓ Test 4 Passed: Uploaded FCO licence (id=${testDocId}, file=${docUpload.body.data.file_url})`);

    // TEST 5: SME approves the FCO licence and approves the partner
    const docApprove = await req(`/documents/${testDocId}/review`, 'PUT', {
      review_status: 'approved',
      remarks: 'FCO licence verified by SME'
    }, 'vivas_sme');
    if (docApprove.status !== 200 || docApprove.body.data?.review_status !== 'approved') {
      throw new Error(`Test 5a Failed: Expected 200 approved for document review, got ${docApprove.status}: ${JSON.stringify(docApprove.body)}`);
    }

    const partnerApprove = await req(`/partners/${testPartnerId}/review`, 'POST', {
      status: 'approved'
    }, 'vivas_sme');
    if (partnerApprove.status !== 200 || partnerApprove.body.data?.status !== 'approved') {
      throw new Error(`Test 5b Failed: Expected 200 approved for partner review, got ${partnerApprove.status}`);
    }
    console.log('✓ Test 5 Passed: Vivas SME approved FCO licence and partner status -> approved');

    // TEST 6: Submit product and SME approves to Live
    const validSubmit = await req(`/products/${testProductId}/submit`, 'POST', {});
    if (validSubmit.status !== 200 || validSubmit.body.data?.status !== 'submitted') {
      throw new Error(`Test 6a Failed: Expected 200 submitted for product, got ${validSubmit.status}: ${JSON.stringify(validSubmit.body)}`);
    }

    const liveApprove = await req(`/products/${testProductId}/review`, 'POST', {
      action: 'live',
      remarks: 'Approved to Live after FCO verification'
    }, 'vivas_sme');
    if (liveApprove.status !== 200 || liveApprove.body.data?.status !== 'live') {
      throw new Error(`Test 6b Failed: Expected 200 live for product review, got ${liveApprove.status}: ${JSON.stringify(liveApprove.body)}`);
    }
    console.log(`✓ Test 6 Passed: Product '${liveApprove.body.data.name}' submitted & approved to status='live'`);

    // TEST 7: Verify Audit Log entries
    const auditRes = await req('/audit-log?limit=20', 'GET', null, 'vivas_sme');
    if (auditRes.status !== 200 || !Array.isArray(auditRes.body.data) || auditRes.body.data.length < 5) {
      throw new Error(`Test 7 Failed: Expected audit log entries, got ${auditRes.status}`);
    }
    console.log(`✓ Test 7 Passed: Verified ${auditRes.body.data.length} recent immutable records in pih_audit_log`);

    // Clean up test partner so only the 5 canonical partners remain
    await pool.query(`DELETE FROM pih_partners WHERE id = $1`, [testPartnerId]);
    console.log('✓ Cleaned up temporary test partner; 5 canonical partners & 40 live products ready.');
  } finally {
    server.close();
  }
}

(async () => {
  try {
    await seedPhase2Data();
    await runPhase2VerificationSuite();
    process.exit(0);
  } catch (err) {
    console.error('Verification failed:', err);
    process.exit(1);
  }
})();
