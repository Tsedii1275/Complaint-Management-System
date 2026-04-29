export const USER_CREDENTIALS = {
  'branchstaff': { 
    username: 'branchstaff', 
    password: 'branch123', 
    role: 'branch-staff',
    route: '/branch-staff',
    displayName: 'Branch Staff'
  },
  'cmd': { 
    username: 'cmd', 
    password: 'cmd123', 
    role: 'cmd',
    route: '/cmd',
    displayName: 'CMD Officer'
  },
  'audit': { 
    username: 'audit', 
    password: 'audit123', 
    role: 'audit',
    route: '/audit',
    displayName: 'Audit Team'
  },
  'workunit': { 
    username: 'workunit', 
    password: 'work123', 
    role: 'work-unit',
    route: '/work-unit',
    displayName: 'Work Unit'
  },
  'service': { 
    username: 'service', 
    password: 'service123', 
    role: 'service-quality',
    route: '/service-quality',
    displayName: 'Service Quality'
  }
};

export const getLoginInfo = (username) => {
  return USER_CREDENTIALS[username.toLowerCase()];
};

export const validateCredentials = (username, password) => {
  const user = USER_CREDENTIALS[username.toLowerCase()];
  return user && user.password === password ? user : null;
};
