import { useEffect } from 'react';
import { getCliVersion } from '../lib/api';
import { toast } from '../lib/toast';

export function CliStatus() {
  useEffect(() => {
    getCliVersion()
      .then((version) => {
        if (version) console.info(`ani-cli ${version} ready`);
      })
      .catch(() => {
        toast.error('ani-cli is unavailable. Search and playback will not work.');
      });
  }, []);

  return null;
}
