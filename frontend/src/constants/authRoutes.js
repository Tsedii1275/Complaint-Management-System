export const ROLE_ROUTES = {
  'ROLE_BRANCH_STAFF': '/branch-staff',
  'ROLE_CMD_OFFICER': '/cmd',
  'ROLE_AUDIT_TEAM': '/audit',
  'ROLE_DEPARTMENT_WORKUNIT': '/work-unit',
  'ROLE_SERVICE_QUALITY': '/service-quality',
  'ROLE_CHIEF_COMMITTEE': '/chief-committee',
  'ROLE_ADMIN': '/admin',

  // Management Dashboard Roles
  'ROLE_BRANCH_MANAGER': '/management-dashboard',
  'ROLE_DEPARTMENT_MANAGER': '/management-dashboard',
  'ROLE_REGIONAL_DIRECTOR': '/management-dashboard',
  'ROLE_DEPARTMENT_DIRECTOR': '/management-dashboard',
  'branch-manager': '/management-dashboard',
  'department-manager': '/management-dashboard',
  'regional-director': '/management-dashboard',
  'department-director': '/management-dashboard',

  // Executive Dashboard Roles
  'ROLE_CHIEF_BANKING_OFFICER': '/executive-dashboard',
  'ROLE_CHIEF_OPERATIONS_OFFICER': '/executive-dashboard',
  'ROLE_EXECUTIVE_COMMITTEE': '/executive-dashboard',
  'ROLE_CEO_OFFICE': '/executive-dashboard',
  'chief-banking-officer': '/executive-dashboard',
  'chief-operations-officer': '/executive-dashboard',
  'executive-committee': '/executive-dashboard',
  'ceo-office': '/executive-dashboard'
};

export const getRouteForRole = (role) => {
  if (!role) return '/login';
  return ROLE_ROUTES[role] || ROLE_ROUTES[role.toUpperCase()] || '/login';
};

