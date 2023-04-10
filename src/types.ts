export type AAAAircratType = {
  id: number;
  manufacturer: string;
  model: string;
  class: AAAVehicleType;
  mtom: string;
  timeAutonomy: number;
  pilot: string;
  band: string;
  color: string;
  lights: string;
  loadWeight: number;
  vhf: boolean;
  visualFrontSensor: string;
  dimension: string;
  energy: string;
};

export type AAAApproval = {
  id: string;
  comment?: string;
  operation?: AAAOperation;
  user?: AAAUser;
  time?: string;
  approved?: boolean;
};

export enum AAAContingencyCause {
  LOST_C2_UPLINK = "LOST_C2_UPLINK",
  LOST_C2_DOWNLINK = "LOST_C2_DOWNLINK",
  LOST_NAV = "LOST_NAV",
  LOST_SAA = "LOST_SAA",
  LOW_FUEL = "LOW_FUEL",
  NO_FUEL = "NO_FUEL",
  MECHANICAL_PROBLEM = "MECHANICAL_PROBLEM",
  SOFTWARE_PROBLEM = "SOFTWARE_PROBLEM",
  ENVIRONMENTAL = "ENVIRONMENTAL",
  SECURITY = "SECURITY",
  TRAFFIC = "TRAFFIC",
  LOST_USS = "LOST_USS",
  OTHER = "OTHER",
  ANY = "ANY",
}

export enum AAAContingencyLocationDescription {
  PREPROGRAMMED = "PREPROGRAMMED",
  OPERATOR_UPDATED = "OPERATOR_UPDATED",
  UA_IDENTIFIED = "UA_IDENTIFIED",
  OTHER = "OTHER",
}

export type AAAContingencyPlan = {
  contingencyId: number;
  contingencyCause: AAAContingencyCause[];
  contingencyResponse: AAAContingencyResponse;
  contingencyPolygon: GeoJSON.Polygon;
  loiterAltitude?: number;
  relativePreference?: number;
  contingencyLocationDescription: AAAContingencyLocationDescription;
  relevantOperationVolumes?: number[];
  validTimeBegin: string;
  validTimeEnd: string;
  freeText?: string;
};

export enum AAAContingencyResponse {
  LANDING = "LANDING",
  LOITERING = "LOITERING",
  RETURN_TO_BASE = "RETURN_TO_BASE",
  OTHER = "OTHER",
}

export type AAADocument = {
  id?: string;
  name: string;
  uploadTime?: string;
  validUntil?: string;
  tag?: string;
  observations?: string;
  valid: boolean;
  extraFields: any;
  downloadFileUrl?: string;
};

export type AAAGeoPoint = {
  longitude: number;
  latitude: number;
};

export type AAAGeo3dPoint = {
  longitude: number;
  latitude: number;
  altitude: number;
};

export type AAANegotiationAgreement = {
  messageId?: string;
  negotiationId?: string;
  ussName?: string;
  ussNameOfOriginator?: string;
  ussNameOfReceiver?: string;
  gufiOriginator?: AAAOperation;
  gufiReceiver?: AAAOperation;
  freeText?: string;
  discoveryReference?: string;
  type?: AAANegotiationAgreementType;
};

export enum AAANegotiationAgreementType {
  INTERSECTION = "INTERSECTION",
  REPLAN = "REPLAN",
}

export type AAANotams = {
  messageId?: string;
  text?: string;
  geography?: GeoJSON.Polygon;
  effectiveTimeBegin?: string;
  effectiveTimeEnd?: string;
};

export type AAAOperationVolume = {
  id?: number;
  ordinal: number;
  volumeType?: "TBOV" | "ABOV";
  nearStructure?: boolean;
  effectiveTimeBegin: string;
  effectiveTimeEnd: string;
  actualTimeEnd?: string;
  minAltitude: number;
  maxAltitude: number;
  operationGeography: any;
  beyondVisualLineOfSight: boolean;
};

export type AAAOperation = {
  gufi: string;
  name: string;
  owner: AAAUser;
  ussName?: string;
  discoveryReference?: string;
  submitTime?: string;
  updateTime?: string;
  aircraftComments?: string;
  flightComments: string;
  volumesDescription?: string;
  airspaceAuthorization?: string;
  state: AAAOperationState;
  controllerLocation?: any;
  gcsLocation?: any;
  faaRule?: AAAOperatonFaaRule;
  operationVolumes: AAAOperationVolume[];
  uasRegistrations?: AAAVehicle[];
  creator: AAAUser;
  contact?: string;
  contactPhone?: string;
  contingencyPlans: AAAContingencyPlan[];
  negotiationAgreements?: AAANegotiationAgreement[];
  priorityElements?: AAAPriorityElements;
};

export enum AAAOperatonFaaRule {
  PART_107 = "PART_107",
  PART_107X = "PART_107X",
  PART_101E = "PART_101E",
  OTHER = "OTHER",
}

export enum AAAOperationState {
  PROPOSED = "PROPOSED",
  ACCEPTED = "ACCEPTED",
  ACTIVATED = "ACTIVATED",
  CLOSED = "CLOSED",
  NONCONFORMING = "NONCONFORMING",
  ROGUE = "ROGUE",
  NOT_ACCEPTED = "NOT_ACCEPTED",
  PENDING = "PENDING",
}

export type AAAPilotPosition = {
  id?: number;
  altitudeGps: number;
  gufi: AAAOperation;
  operationId: string;
  location: GeoJSON.Point;
  timeSent: string;
};

export type AAAPosition = {
  id?: number;
  altitudeGps: number;
  altitudeNumGpsSatellites: number;
  comments?: string;
  enroutePositionsId: string;
  gufi: AAAOperation;
  operationId: string;
  hdopGps: number;
  location: GeoJSON.Point;
  timeMeasured: string;
  timeSent: string;
  trackBearing: number;
  trackBearingReference: "TRUE_NORTH" | "MAGNETIC_NORTH";
  trackBearingUom: "DEG";
  trackGroundSpeed: number;
  trackGroundSpeedUnits: "KT" | "KM_H";
  ussName: string;
  discoveryReference?: string;
  vdopGps: number;
  heading?: number;
  addedFromDatFile: boolean;
  uvin?: AAAVehicle;
};

export type AAAPriorityElements = {
  priorityLevel?: Severity;
  priorityStatus: AAAPriorityStatus;
};

export enum AAAPriorityStatus {
  NONE = "NONE",
  PUBLIC_SAFETY = "PUBLIC_SAFETY",
  EMERGENCY_AIRBORNE_IMPACT = "EMERGENCY_AIRBORNE_IMPACT",
  EMERGENCY_GROUND_IMPACT = "EMERGENCY_GROUND_IMPACT",
  EMERGENCY_AIR_AND_GROUND_IMPACT = "EMERGENCY_AIR_AND_GROUND_IMPACT",
}

export type AAARegularFlightSegment = {
  id: string;
  start: AAAGeo3dPoint;
  end: AAAGeo3dPoint;
  horizontalBuffer: number;
  verticalBuffer: number;
  groundSpeed: number;
  timeBuffer: number;
  ordinal: number;
};

export type AAARegularFlight = {
  id: string;
  startingPort: AAAVertiport;
  endingPort: AAAVertiport;
  path: AAARegularFlightSegment[];
  name: string;
  verticalSpeed: number;
};

export type AAARestrictedFlightVolume = {
  id?: string;
  geography: GeoJSON.Polygon;
  minAltitude: number;
  maxAltitude: number;
  comments: string;
  deletedAt?: Date;
};

export enum AAARole {
  ADMIN = "ADMIN",
  PILOT = "PILOT",
  MONITOR = "MONITOR",
}

export enum Severity {
  EMERGENCY = "EMERGENCY",
  ALERT = "ALERT",
  CRITICAL = "CRITICAL",
  WARNING = "WARNING",
  NOTICE = "NOTICE",
  INFORMATIONAL = "INFORMATIONAL",
}

export enum AAAStatus {
  UNCONFIRMED = "unconfirmed",
  CONFIRMED = "confirmed",
}

export type AAAToken = {
  username?: string;
  token?: string;
};

export type AAAUASVolumeReservation = {
  messageId?: string;
  ussName?: string;
  type?: AAAUASVolumeReservationType;
  permittedUas?: AAAUASVolumeReservationPermitedUas[];
  requiredSupport?: AAAUASVolumeReservationRequiredSupport[];
  permittedOperations?: AAAOperation[];
  permittedGufis?: Array<string>;
  cause?: AAAUASVolumeReservationCause;
  geography?: GeoJSON.Polygon;
  effectiveTimeBegin?: string;
  effectiveTimeEnd?: string;
  actualTimeEnd?: string;
  minAltitude?: number;
  maxAltitude?: number;
  reason?: string;
  deletedAt?: Date;
  enaireLayerId?: string;
  enaireNotamId?: string;
};

export enum AAAUASVolumeReservationCause {
  WEATHER = "WEATHER",
  ATC = "ATC",
  SECURITY = "SECURITY",
  SAFETY = "SAFETY",
  MUNICIPALITY = "MUNICIPALITY",
  OTHER = "OTHER",
}

export enum AAAUASVolumeReservationPermitedUas {
  NOT_SET = "NOT_SET",
  PUBLIC_SAFETY = "PUBLIC_SAFETY",
  SECURITY = "SECURITY",
  NEWS_GATHERING = "NEWS_GATHERING",
  VLOS = "VLOS",
  SUPPORT_LEVEL = "SUPPORT_LEVEL",
  PART_107 = "PART_107",
  PART_101E = "PART_101E",
  PART_107X = "PART_107X",
  RADIO_LINE_OF_SIGHT = "RADIO_LINE_OF_SIGHT",
}

export enum AAAUASVolumeReservationRequiredSupport {
  V2V = "V2V",
  DAA = "DAA",
  ADSB_OUT = "ADSB_OUT",
  ADSB_IN = "ADSB_IN",
  CONSPICUITY = "CONSPICUITY",
  ENHANCED_NAVIGATION = "ENHANCED_NAVIGATION",
  ENHANCED_SAFE_LANDING = "ENHANCED_SAFE_LANDING",
}

export enum AAAUASVolumeReservationType {
  DYNAMIC_RESTRICTION = "DYNAMIC_RESTRICTION",
  STATIC_ADVISORY = "STATIC_ADVISORY",
}

export type AAAUserStatus = {
  id?: string;
  token?: string;
  status?: AAAStatus;
};

export type AAAUser = {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  role: AAARole;
  VolumesOfInterest?: any;
  settings?: string;
  extraFields?: any;
  deletedAt?: Date;
  verificationToken?: string;
  verified?: boolean;
};

export type AAAUTMMessage = {
  messageId?: string;
  ussName?: string;
  discoveryReference?: string;
  operation?: AAAOperation;
  gufi?: string;
  timeSent?: string;
  severity?: Severity;
  messageType?:
    | "UNPLANNED_LANDING"
    | "UNCONTROLLED_LANDING"
    | "OPERATION_NONCONFORMING"
    | "OPERATION_ROGUE"
    | "OPERATION_CONFORMING"
    | "OPERATION_CLOSED"
    | "CONTINGENCY_PLAN_INITIATED"
    | "CONTINGENCY_PLAN_CANCELLED"
    | "PERIODIC_POSITION_REPORTS_START"
    | "PERIODIC_POSITION_REPORTS_END"
    | "UNAUTHORIZED_AIRSPACE_PROXIMITY"
    | "UNAUTHORIZED_AIRSPACE_ENTRY"
    | "OTHER_SEE_FREE_TEXT";
  prevMessageId?: string;
  freeText?: string;
  callback?: string;
};

export type AAAVehicle = {
  uvin?: string;
  date?: string;
  registeredBy?: AAAUser;
  owner?: AAAUser;
  operators?: AAAUser[];
  nNumber: string;
  faaNumber?: string;
  vehicleName: string;
  manufacturer?: string;
  model?: string;
  class: AAAVehicleType;
  payload?: string[];
  accessType?: string;
  vehicleTypeId: string;
  orgUUID: string;
  trackerId?: string;
  authorized?: AAAVehicleAuthorizeStatus;
  extraFields?: any;
};

export enum AAAVehicleAuthorizeStatus {
  PENDING = "PENDING",
  AUTHORIZED = "AUTHORIZED",
  NOT_AUTHORIZED = "NOT_AUTHORIZED",
}

export enum AAAVehicleType {
  MULTIROTOR = "MULTIROTOR",
  FIXEDWING = "FIXEDWING",
  VTOL = "VTOL",
  OTHER = "OTHER",
}

export type AAAVertiport = {
  id: string;
  name: string;
  point: any;
  buffer: number;
  closedHours: string[];
  timeBetweenFlights: number;
};
