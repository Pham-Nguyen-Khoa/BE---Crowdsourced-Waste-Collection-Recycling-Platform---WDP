import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

export class ZoneCodeDuplicatedException extends ConflictException {
  constructor() {
    super('Zone code already exists in this enterprise.');
  }
}

export class ZoneLocationForbiddenException extends ForbiddenException {
  constructor() {
    super('Zone location outside service area.');
  }
}

export class ZoneInUseException extends BadRequestException {
  constructor() {
    super('Cannot delete zone with active collectors.');
  }
}

export class ZoneNotFoundException extends NotFoundException {
  constructor() {
    super('Zone not found or access denied.');
  }
}
