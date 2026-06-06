export const LABOUR_ROLES = [
  "Damar Labour / डामर लेबर",
  "JCB Operator / जेसीबी ऑपरेटर",
  "Grader Operator / ग्रेडर ऑपरेटर",
  "Paver Operator / पेवर ऑपरेटर",
  "Roller Operator / रोलर ऑपरेटर",
  "Hywa Driver / हाइवा ड्राइवर",
  "Tractor Driver / ट्रैक्टर ड्राइवर",
  "Safai Labour / सफाई लेबर",
  "Supervisor / सुपरवाइजर",
  "Cook / खाना बनाने वाला",
  "Other / अन्य",
] as const;

export const LABOUR_CATEGORIES = [
  "Labour / मजदूरी",
  "Labour Advance / मजदूर एडवांस",
  "Supervisor Expense / सुपरवाइजर खर्च",
] as const;

export const EQUIPMENT_NAMES = [
  "JCB",
  "Grader / ग्रेडर",
  "Paver / पेवर",
  "Tandem Roller / टेंडम रोलर",
  "Compressor / कंप्रेशर",
  "Hywa / हाइवा",
  "Tipper / टिपर",
  "Tractor / ट्रैक्टर",
  "Boiler / बॉयलर",
  "Fortuner / फॉर्चूनर",
  "Scorpio / स्कॉर्पियो",
  "Other / अन्य",
] as const;

export const EQUIPMENT_CATEGORIES = [
  "Diesel / डीजल",
  "Equipment Hire / मशीन भाड़ा",
  "Equipment Advance / मशीन एडवांस",
  "Repair / मरम्मत",
  "Transport / यातायात",
] as const;

export const CATEGORIES = [
  "Diesel / डीजल",
  "Food / खाना",
  "Hotel / होटल",
  "Labour / मजदूरी",
  "Labour Advance / मजदूर एडवांस",
  "Supervisor Expense / सुपरवाइजर खर्च",
  "Material / सामग्री",
  "Road Safety / रोड सेफ्टी",
  "Equipment Hire / मशीन भाड़ा",
  "Equipment Advance / मशीन एडवांस",
  "Transport / यातायात",
  "Toll / टोल",
  "Repair / मरम्मत",
  "Advance / एडवांस",
  "Consultancy / कंसल्टेंसी",
  "Stationery / स्टेशनरी",
  "Fund Received / नकद प्राप्त",
  "Transfer / ट्रांसफर",
  "Other / अन्य",
] as const;

export type Category = (typeof CATEGORIES)[number];

export function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n || 0);
}

export function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}
