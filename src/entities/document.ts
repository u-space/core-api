/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ObjectLiteral,
  CreateDateColumn,
} from "typeorm";

// const uploadPath = uploadFolder;
// const path = `${backendUrl}`;

@Entity()
export class Document {
  extra_fields_str?: string;

  @PrimaryGeneratedColumn("uuid")
  id?: string;

  @Column({ type: "varchar" })
  name: string;

  // @Column({
  // 	type: 'timestamp without time zone'
  // })
  @CreateDateColumn({ type: "timestamp with time zone" })
  upload_time?: string;

  @Column({ type: "timestamp without time zone", nullable: true })
  valid_until?: string;

  @Column({ type: "varchar", nullable: true })
  tag?: string;

  @Column({ type: "varchar", nullable: true })
  observations?: string;

  @Column({ type: "bool", nullable: false, default: false })
  valid: boolean;

  @Column("simple-json", { nullable: true, default: {} })
  extra_fields: ObjectLiteral;

  downloadFileUrl?: string;

  getFileName() {
    return this.name; //`${this.name}`;
  }

  constructor(
    name: string,
    tag: string,
    valid_until: string,
    observations: string,
    valid: boolean,
    extra_fields: ObjectLiteral
  ) {
    this.name = name;
    this.tag = tag;
    this.valid_until = valid_until;
    this.observations = observations;
    this.valid = valid;
    this.extra_fields = extra_fields;
  }

  //TODO EMI pasar a extra fields
  static getDocumentTypes() {
    return [];
  }

  /**
   * @returns document simple extra fields.
   */
  getExtraFieldSchema(): ObjectLiteral {
    const tag: any = this.tag;
    return Document.getExtraFieldSchema(tag);
  }

  static extraFieldsSchemas: any = {
    InsuranceDocument: {
      insurance_carrier: { type: "varchar", required: true },
      insurance_date_begin: { type: "Date", required: true },
      insurance_limit: { type: "varchar", required: true },
    },
    OperatorRegisterDocument: {},
    TheoricalUasDocument: {
      school: { type: "varchar", required: true },
      pilotCometence: { type: "varchar", required: true },
    },
    PracticalUasDocument: {
      school: { type: "varchar", required: true },
      pilotCometence: { type: "varchar", required: true },
    },
    LiabilityInsuranceDocument: {
      insurance_carrier: { type: "varchar", required: true },
      insurance_date_begin: { type: "Date", required: true },
      insurance_limit: { type: "Number", required: true },
    },
    Sts01Docuemnt: {
      school: { type: "varchar", required: true },
      pilotCometence: { type: "varchar", required: true },
    },
    Sts02Docuemnt: {
      school: { type: "varchar", required: true },
      pilotCometence: { type: "varchar", required: true },
    },
    RadiofonistDocument: {
      school: { type: "varchar", required: true },
      pilotCometence: { type: "varchar", required: true },
    },
    Other: {},
  };

  static getExtraFieldSchema(tag: string): ObjectLiteral {
    return Document.extraFieldsSchemas[tag];
  }
}

export function setExtraField(document: Record<string, unknown>) {
  if (document.extra_fields_str) {
    try {
      document.extra_fields = JSON.parse(document.extra_fields_str as string);
    } catch (error) {
      document.extra_fields = {};
    }
    delete document.extra_fields_str;
  }
}

export function setFileName(request: any, document: unknown) {
  if (request.files && request.files[0]) {
    const files = request.files;
    const fileMetadata = files[0];
    (document as { name: unknown }).name = fileMetadata.filename;
  }
}
