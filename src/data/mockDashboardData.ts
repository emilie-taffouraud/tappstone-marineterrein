import {
  Activity,
  Camera,
  Droplets,
  Lamp,
  Router,
  ShieldAlert,
  Users,
  Volume2,
  Waves,
} from "lucide-react";
import type {
  AccessPoint,
  AlertItem,
  AnomalyItem,
  CrowdZone,
  DailyTrendPoint,
  InfrastructureItem,
  Kpi,
  ModalityPoint,
  SensorHealthItem,
  TrendPoint,
} from "../components/dashboard/types";

const locationLabel = (name: string, building: string) => `${name} (${building})`;

export const zones = [
  { id: "accufanfare-001", name: locationLabel("ACCUFanfare", "001") },
  { id: "ahk-culture-club-027-k", name: locationLabel("AHK Culture Club", "027 K") },
  { id: "ahk-learning-lab-024-b", name: locationLabel("AHK Learning Lab", "024 B") },
  { id: "ahk-makerspace-027-n", name: locationLabel("AHK MakerSpace", "027 N") },
  { id: "ahk-vracademy-002-b", name: locationLabel("AHK VRAcademy", "002 B") },
  { id: "am-flow-003-h", name: locationLabel("AM-Flow", "003 H") },
  { id: "ams-institute-027-w", name: locationLabel("AMS Institute", "027 W") },
  { id: "amsterdam-economic-board-002-a", name: locationLabel("Amsterdam Economic Board", "002 A") },
  { id: "amsterdam-inchange-002-a", name: locationLabel("Amsterdam InChange", "002 A") },
  {
    id: "annemarie-van-pol-phyllis-van-winsen-001",
    name: locationLabel("Annemarie van Pol & Phyllis van Winsen", "001"),
  },
  {
    id: "atelier-zoet-zagen-interieur-intro-vert-003-c",
    name: locationLabel("Atelier Zoet & Zagen / interieur intro.vert", "003 C"),
  },
  { id: "brouwerij-homeland-027-o", name: locationLabel("Brouwerij Homeland", "027 O") },
  { id: "buurtboerderij-centraal-027-e", name: locationLabel("Buurtboerderij Centraal", "027 E") },
  { id: "cinekid-003-g", name: locationLabel("Cinekid", "003 G") },
  { id: "codam-039", name: locationLabel("CODAM", "039") },
  { id: "crcl-park-027-a", name: locationLabel("CRCL PARK", "027 A") },
  { id: "droppie-027-w", name: locationLabel("Droppie", "027 W") },
  { id: "dutch-blue-003-b", name: locationLabel("Dutch Blue", "003 B") },
  { id: "dutch-edtech-027-e", name: locationLabel("Dutch Edtech", "027 E") },
  { id: "fmo-solutions-003-g", name: locationLabel("FMO Solutions", "003 G") },
  {
    id: "gemeente-amsterdam-afdeling-innovatie-027-s",
    name: locationLabel("Gemeente Amsterdam afdeling Innovatie", "027 S"),
  },
  { id: "grasple-003-d", name: locationLabel("Grasple", "003 D") },
  { id: "herprogrammeer-de-overheid-003-c", name: locationLabel("Herprogrammeer de Overheid", "003 C") },
  { id: "house-of-humans-003-a", name: locationLabel("House of Humans", "003 A") },
  { id: "impact-hub-amsterdam-027", name: locationLabel("Impact Hub Amsterdam", "027") },
  { id: "info-027-e", name: locationLabel("INFO", "027 E") },
  { id: "itorium-027-e", name: locationLabel("Itorium", "027 E") },
  { id: "kanteen25-025-b", name: locationLabel("Kanteen25", "025 B") },
  { id: "kometen-brood-loket-022", name: locationLabel("Kometen Brood Loket", "022") },
  { id: "la-bolleur-027-l", name: locationLabel("La Bolleur", "027 L") },
  { id: "lighthouse-024-b", name: locationLabel("Lighthouse", "024 B") },
  { id: "new-urban-standard-003-b", name: locationLabel("New Urban Standard", "003 B") },
  { id: "open-state-foundation-002-b", name: locationLabel("Open State Foundation", "002 B") },
  { id: "openembassy-003-c", name: locationLabel("OpenEmbassy", "003 C") },
  { id: "orientation-travel-productions-003-b", name: locationLabel("Orientation Travel Productions", "003 B") },
  {
    id: "peer-academy-roc-van-amsterdam-en-flevoland-024-c",
    name: locationLabel("Peer Academy | ROC van Amsterdam en Flevoland", "024 C"),
  },
  { id: "pension-homeland-006", name: locationLabel("Pension Homeland", "006") },
  { id: "permavoid-003-d", name: locationLabel("Permavoid", "003 D") },
  { id: "pnp-media-green-key-studio-003-a", name: locationLabel("PNP Media | Green Key Studio", "003 A") },
  { id: "portiersloge-marineterrein", name: locationLabel("Portiersloge (Polo) Marineterrein", "Portiersloge") },
  { id: "rainup-003-g", name: locationLabel("Rainup", "003 G") },
  { id: "resourcefully-027-e", name: locationLabel("Resourcefully", "027 E") },
  { id: "roboat-027-w", name: locationLabel("Roboat", "027 W") },
  { id: "roc-van-amsterdam-003-a", name: locationLabel("ROC van Amsterdam", "003 A") },
  { id: "rooms25-025-a", name: locationLabel("Rooms25", "025 A") },
  { id: "scaleup-impact-003-h", name: locationLabel("ScaleUp Impact", "003 H") },
  { id: "scheepskameel-024-a", name: locationLabel("Scheepskameel", "024 A") },
  { id: "society-college-001", name: locationLabel("Society College", "001") },
  { id: "studio-her-003-a", name: locationLabel("Studio HER", "003 A") },
  { id: "studio-zeitgeist-003-h", name: locationLabel("Studio Zeitgeist", "003 H") },
  { id: "tapp-027-e", name: locationLabel("TAPP", "027 E") },
  { id: "the-great-bubble-barrier-003-c", name: locationLabel("The Great Bubble Barrier", "003 C") },
  { id: "the-next-speaker-002-b", name: locationLabel("The Next Speaker", "002 B") },
  { id: "tomorrow-agency-003-g", name: locationLabel("Tomorrow Agency", "003 G") },
  { id: "tv-academy-academy-pictures-002-a", name: locationLabel("TV Academy / Academy Pictures", "002 A") },
  { id: "universiteit-van-nederland-027-e", name: locationLabel("Universiteit van Nederland", "027 E") },
  { id: "voets-tepp-001", name: locationLabel("Voets+TEPP", "001") },
];

const accufanfare = locationLabel("ACCUFanfare", "001");
const ahkLearningLab = locationLabel("AHK Learning Lab", "024 B");
const ahkMakerSpace = locationLabel("AHK MakerSpace", "027 N");
const amFlow = locationLabel("AM-Flow", "003 H");
const codam = locationLabel("CODAM", "039");
const crclPark = locationLabel("CRCL PARK", "027 A");
const impactHubAmsterdam = locationLabel("Impact Hub Amsterdam", "027");
const infoLocation = locationLabel("INFO", "027 E");
const portiersloge = locationLabel("Portiersloge (Polo) Marineterrein", "Portiersloge");
const robaat = locationLabel("Roboat", "027 W");
const scheepskameel = locationLabel("Scheepskameel", "024 A");
const tapp = locationLabel("TAPP", "027 E");

export const sensorCategories = [
  "All categories",
  "Crowd & Footfall",
  "Mobility & Access",
  "Environmental Conditions",
  "Water & Recreation",
  "Public Infrastructure",
  "Safety & Monitoring",
];

export const severityOptions = ["All severities", "info", "warning", "critical"];
export const timeRangeOptions = ["Last 30 min", "Last 2 hrs", "Today"];
export const modeOptions = ["Live", "Historical", "Incident mode"];

export const alertsData: AlertItem[] = [
  {
    id: 1,
    severity: "warning",
    title: "Busy lunch build-up around TAPP",
    zone: tapp,
    source: "Swim Counter",
    time: "10:22",
    detail: "Foot traffic is picking up around the lunch area. Extra staff visibility may help if the rise continues.",
  },
  {
    id: 2,
    severity: "warning",
    title: "Noise level running higher than usual",
    zone: codam,
    source: "Environmental Sound Meter",
    time: "10:18",
    detail: "Sound has stayed elevated for several minutes, which may point to an event or a gathering nearby.",
  },
  {
    id: 3,
    severity: "info",
    title: "Visitor flow trending upward",
    zone: portiersloge,
    source: "Pedestrian Traffic Monitor",
    time: "10:15",
    detail: "More people are coming through than in the previous half hour.",
  },
  {
    id: 4,
    severity: "critical",
    title: "Camera feed offline",
    zone: ahkMakerSpace,
    source: "CCTV Shutter",
    time: "10:08",
    detail: "One camera has stopped sending updates and may need a quick check on site.",
  },
];

export const kpis: Kpi[] = [
  {
    label: "Live visitors",
    value: "612",
    delta: "+8.4%",
    trend: "up",
    helper: "vs previous hour",
    icon: Users,
  },
  {
    label: "Active alerts",
    value: "4",
    delta: "+1",
    trend: "up",
    helper: "1 critical, 2 warning",
    icon: ShieldAlert,
  },
  {
    label: "Avg. sound level",
    value: "68 dB",
    delta: "+4 dB",
    trend: "up",
    helper: "site-wide rolling 15 min",
    icon: Volume2,
  },
  {
    label: "Healthy sensors",
    value: "12 / 14",
    delta: "-1",
    trend: "down",
    helper: "1 degraded, 1 offline",
    icon: Activity,
  },
  {
    label: "Water temperature",
    value: "19.1°C",
    delta: "+0.6°C",
    trend: "up",
    helper: "comfortable recreational range",
    icon: Waves,
  },
];

export const crowdByZone: CrowdZone[] = [
  { zone: portiersloge, visitors: 138, density: 61, status: "stable" },
  { zone: codam, visitors: 214, density: 82, status: "busy" },
  { zone: tapp, visitors: 167, density: 74, status: "watch" },
  { zone: ahkMakerSpace, visitors: 93, density: 38, status: "calm" },
];

export const pedestrianTrend: TrendPoint[] = [
  { time: "09:20", flow: 64, crowd: 420, sound: 58 },
  { time: "09:30", flow: 71, crowd: 448, sound: 60 },
  { time: "09:40", flow: 76, crowd: 485, sound: 61 },
  { time: "09:50", flow: 82, crowd: 516, sound: 64 },
  { time: "10:00", flow: 88, crowd: 544, sound: 66 },
  { time: "10:10", flow: 93, crowd: 583, sound: 70 },
  { time: "10:20", flow: 97, crowd: 612, sound: 68 },
];

export const modalitySplit: ModalityPoint[] = [
  { name: "Pedestrian", value: 61 },
  { name: "Bike", value: 23 },
  { name: "Service Vehicle", value: 9 },
  { name: "Other", value: 7 },
];

export const accessActivity: AccessPoint[] = [
  { time: "09:20", access: 18, vehicles: 4 },
  { time: "09:40", access: 22, vehicles: 7 },
  { time: "10:00", access: 27, vehicles: 6 },
  { time: "10:20", access: 35, vehicles: 9 },
];

export const sensorHealth: SensorHealthItem[] = [
  {
    sensor: "Digital Kiosk",
    category: "Public Infrastructure",
    status: "healthy",
    zone: impactHubAmsterdam,
  },
  {
    sensor: "Urban Sound Classification",
    category: "Environmental Conditions",
    status: "healthy",
    zone: codam,
  },
  {
    sensor: "Pedestrian Traffic Monitor",
    category: "Crowd & Footfall",
    status: "healthy",
    zone: portiersloge,
  },
  {
    sensor: "RFID & License Plate Scanner",
    category: "Mobility & Access",
    status: "healthy",
    zone: accufanfare,
  },
  {
    sensor: "Public Sensor Signage",
    category: "Public Infrastructure",
    status: "healthy",
    zone: infoLocation,
  },
  {
    sensor: "Modality Counter",
    category: "Mobility & Access",
    status: "healthy",
    zone: amFlow,
  },
  {
    sensor: "Crowd Size Monitor",
    category: "Crowd & Footfall",
    status: "healthy",
    zone: tapp,
  },
  {
    sensor: "Environmental Sound Meter",
    category: "Environmental Conditions",
    status: "degraded",
    zone: codam,
  },
  {
    sensor: "Smart Street Lights",
    category: "Public Infrastructure",
    status: "healthy",
    zone: crclPark,
  },
  {
    sensor: "Water Temperature",
    category: "Water & Recreation",
    status: "healthy",
    zone: scheepskameel,
  },
  {
    sensor: "RFID Sensor & Microphone",
    category: "Safety & Monitoring",
    status: "healthy",
    zone: robaat,
  },
  {
    sensor: "CCTV Shutter",
    category: "Safety & Monitoring",
    status: "offline",
    zone: ahkMakerSpace,
  },
  {
    sensor: "Swim Counter",
    category: "Water & Recreation",
    status: "healthy",
    zone: ahkLearningLab,
  },
  {
    sensor: "Picnic Counter",
    category: "Crowd & Footfall",
    status: "healthy",
    zone: portiersloge,
  },
];

export const dailyTrend: DailyTrendPoint[] = [
  { day: "Mon", visitors: 4200, alerts: 3, avgNoise: 61 },
  { day: "Tue", visitors: 4460, alerts: 4, avgNoise: 62 },
  { day: "Wed", visitors: 4330, alerts: 2, avgNoise: 60 },
  { day: "Thu", visitors: 4720, alerts: 5, avgNoise: 64 },
  { day: "Fri", visitors: 4890, alerts: 4, avgNoise: 65 },
  { day: "Sat", visitors: 5380, alerts: 6, avgNoise: 69 },
  { day: "Sun", visitors: 5010, alerts: 4, avgNoise: 66 },
];

export const infrastructureStatus: InfrastructureItem[] = [
  {
    label: "Street lights online",
    value: "98%",
    note: "1 lamp group in maintenance window",
    icon: Lamp,
  },
  {
    label: "Digital signage uptime",
    value: "100%",
    note: "No kiosk faults in current shift",
    icon: Router,
  },
  {
    label: "Camera network",
    value: "93%",
    note: `1 camera feed offline near ${ahkMakerSpace}`,
    icon: Camera,
  },
];

export const anomalyPanel: AnomalyItem[] = [
  {
    title: "Noise rising faster than visitor numbers",
    description:
      `${codam} is louder than usual compared with the number of visitors there, which suggests a local activity rather than a site-wide increase.`,
    confidence: "moderate",
  },
  {
    title: "Entry activity picking up",
    description:
      `${portiersloge} saw a clear rise in arrivals in the latest update, but it still matches a normal busy period.`,
    confidence: "low",
  },
  {
    title: "Steady build-up around food and meeting spots",
    description:
      `Around ${tapp}, activity is still climbing and may stay busy through the next hour.`,
    confidence: "high",
  },
];

export const widgetIcons = {
  droplet: Droplets,
};
