// The 10 profile pictures people can choose from. Photos cannot be uploaded.
// The key (avatar-01 ... avatar-10) is what is saved in users.avatar_key. api/ai/tools.js lists the same keys.
import a01 from '../assets/avatars/avatar-01.svg'
import a02 from '../assets/avatars/avatar-02.svg'
import a03 from '../assets/avatars/avatar-03.svg'
import a04 from '../assets/avatars/avatar-04.svg'
import a05 from '../assets/avatars/avatar-05.svg'
import a06 from '../assets/avatars/avatar-06.svg'
import a07 from '../assets/avatars/avatar-07.svg'
import a08 from '../assets/avatars/avatar-08.svg'
import a09 from '../assets/avatars/avatar-09.svg'
import a10 from '../assets/avatars/avatar-10.svg'

export const AVATARS = [
  { key: 'avatar-01', file: a01, label: '1' },
  { key: 'avatar-02', file: a02, label: '2' },
  { key: 'avatar-03', file: a03, label: '3' },
  { key: 'avatar-04', file: a04, label: '4' },
  { key: 'avatar-05', file: a05, label: '5' },
  { key: 'avatar-06', file: a06, label: '6' },
  { key: 'avatar-07', file: a07, label: '7' },
  { key: 'avatar-08', file: a08, label: '8' },
  { key: 'avatar-09', file: a09, label: '9' },
  { key: 'avatar-10', file: a10, label: '10' },
]

export const AVATAR_KEYS = AVATARS.map(a => a.key)

// Returns the picture for a saved key, or null when the user has not chosen one yet
export const getAvatar = (key) => AVATARS.find(a => a.key === key)?.file || null
