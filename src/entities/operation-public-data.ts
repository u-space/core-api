import { OperationState } from "./operation";
import { OperationVolume } from "./operation-volume";
import { OperatorPublicData } from "./operator-public-data";
import { VehiclePublicData } from "./vehicle-public-data";

export interface OperationPublicData {
  gufi: string;
  name: string;
  state: OperationState;
  operation_volumes: OperationVolume[];
  uas_registrations: VehiclePublicData[];
  operators: OperatorPublicData[];
}
