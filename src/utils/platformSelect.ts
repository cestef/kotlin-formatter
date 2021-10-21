// Possible values 'aix', 'darwin', 'freebsd', 'linux', 'openbsd', 'sunos', and 'win32'
// Can be expanded to be as granular as needed
const platformSelect = <T>({
  windows,
  default: _default,
}: {
  windows: T,
  default: T,
}): T => {
  const { platform } = process;
  switch (platform) {
    case 'win32':
      return windows;
    default:
      return _default;
  }
};

export default platformSelect;
