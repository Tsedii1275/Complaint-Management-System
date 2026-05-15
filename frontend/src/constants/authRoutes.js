export const ROLE_ROUTES = {
  'ROLE_BRANCH_STAFF': '/branch-staff',
  'ROLE_CMD_OFFICER': '/cmd',
  'ROLE_AUDIT_TEAM': '/audit',
  'ROLE_DEPARTMENT_WORKUNIT': '/work-unit',
  'ROLE_SERVICE_QUALITY': '/service-quality',
  'ROLE_ADMIN': '/admin'
};

export const getRouteForRole = (role) => {
  return ROLE_ROUTES[role] || '/login';
};

