import platformInfo from "@/common/platform_info";
import { LicenseStatus } from "@/lib/license";
import { isVersionLessThanOrEqual } from "@/common/version";
import { Column, Entity, Not } from "typeorm";
import { ApplicationEntity } from "./application_entity";
import _ from 'lodash';
import globals from "@/common/globals";


function daysInFuture(days: number = 14) {
  return new Date(new Date().setDate(new Date().getDate() + days))
}


@Entity({ name: 'license_keys' })
export class LicenseKey extends ApplicationEntity {

  withProps(props: any) {
    if (props) LicenseKey.merge(this, props);
    return this;
  }

  @Column({type: 'varchar', nullable: false})
  email: string

  @Column({type: 'varchar', nullable: false})
  key: string

  @Column({type: 'datetime', nullable: false})
  validUntil: Date

  @Column({type: 'datetime', nullable: false})
  supportUntil: Date

  @Column({ type: 'varchar', nullable: false })
  licenseType: 'TrialLicense' | 'PersonalLicense' | 'BusinessLicense'

  @Column({ type: 'json', nullable: true })
  maxAllowedAppRelease: { tagName: string }

  /** Get all licenses except trial */
  static async all() {
    return await LicenseKey.findBy({ licenseType: Not("TrialLicense" as const) });
  }

  /** Delete all licenses except trial */
  static async wipe() {
    await LicenseKey.delete({ licenseType: Not("TrialLicense" as const) });
  }

  static async getLicenseStatus(): Promise<LicenseStatus> {
    const status = new LicenseStatus();
    status.condition = []

    const licenses = await LicenseKey.find();
    const currentDate = new Date();
    const currentVersion = platformInfo.parsedAppVersion;

    const currentLicense = _.orderBy(licenses, ["validUntil"], ["desc"])[0];
    status.license = currentLicense;
    
    status.edition = "ultimate";
    status.condition.push("No app version restriction");
    return status;
  }

  public get active() : boolean {
    return this.validUntil && this.validUntil > new Date()
  }

  public static async createTrialLicense(validUntil = daysInFuture(globals.freeTrialDays), supportUntil = validUntil) {
    if ((await LicenseKey.count()) !== 0) {
      throw new Error("Not allowed");
    }

    const trialLicense = new LicenseKey();
    trialLicense.email = "trial_user";
    trialLicense.key = "fake";
    trialLicense.validUntil = validUntil;
    trialLicense.supportUntil = supportUntil;
    trialLicense.licenseType = "TrialLicense";
    await trialLicense.save();
    return trialLicense;
  }
}

