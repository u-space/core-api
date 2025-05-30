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
  DeleteDateColumn,
} from "typeorm";
import {
  USER_DOCUMENT_EXTRA_FIELDS_SCHEMA,
  VEHICLE_DOCUMENT_EXTRA_FIELDS_SCHEMA,
} from "../utils/config.utils";

export enum ReferencedEntityType {
  USER = "user",
  VEHICLE = "vehicle",
}

@Entity()
export class Document {
  extra_fields_str?: string;

  @PrimaryGeneratedColumn("uuid")
  id?: string;

  @Column({ type: "varchar" })
  name: string;

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

  @DeleteDateColumn({ type: "timestamp without time zone", nullable: true })
  deletedAt?: string;

  @Column("simple-json", { nullable: true, default: {} })
  extra_fields?: object;

  @Column({ type: "json", nullable: true })
  extra_fields_json?: object;

  @Column({ type: "json", nullable: true })
  notifications?: Record<number, boolean>;

  @Column({ type: "varchar", nullable: true })
  referenced_entity_id?: string;

  @Column({ type: "varchar", nullable: true })
  referenced_entity_type?: string;

  downloadFileUrl?: string;

  getFileName() {
    return this.name; //`${this.name}`;
  }

  setNotificationSended(day: number) {
    if (!this.notifications) {
      this.notifications = {};
    }
    this.notifications[day] = true;
  }

  constructor(
    name: string,
    tag: string,
    valid_until: string,
    observations: string,
    valid: boolean,
    extra_fields: ObjectLiteral,
    notifications: any,
    referenced_entity_id: string,
    referenced_entity_type: string,
    deletedAt?: string
  ) {
    this.name = name;
    this.tag = tag;
    this.valid_until = valid_until;
    this.observations = observations;
    this.valid = valid;
    this.extra_fields = extra_fields;
    this.notifications = notifications ? notifications : {};
    this.referenced_entity_id = referenced_entity_id;
    this.referenced_entity_type = referenced_entity_type;
    this.deletedAt = deletedAt;
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

  static userDocumentExtraFieldsSchemas: any = require(USER_DOCUMENT_EXTRA_FIELDS_SCHEMA!);
  static vehicleDocumentExtraFieldsSchemas: any = require(VEHICLE_DOCUMENT_EXTRA_FIELDS_SCHEMA!);

  static getExtraFieldSchema(tag: string): ObjectLiteral {
    // TODO: Could be an error if user and vehicle document schemas have same tag with different schema
    // To fix this, we have to return user document schema if the document belongs to a user, and vehicle document schema if document belongs to a vehicle
    if (Object.keys(Document.userDocumentExtraFieldsSchemas).includes(tag)) {
      return Document.userDocumentExtraFieldsSchemas[tag];
    }
    return Document.vehicleDocumentExtraFieldsSchemas[tag];
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
