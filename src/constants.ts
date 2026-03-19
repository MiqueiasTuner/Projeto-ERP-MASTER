import { UserPermissions } from '../types';

export const SUPER_ADMIN_EMAILS = ['miqueiasyout@gmail.com'];

export const INITIAL_PERMISSIONS: UserPermissions = {
  properties: ['view', 'edit', 'delete'],
  inventory: ['view', 'edit', 'delete'],
  finances: ['view', 'edit', 'delete'],
  teams: ['view', 'edit', 'delete'],
  reports: ['view', 'edit', 'delete'],
  brokers: ['view', 'edit', 'delete']
};
