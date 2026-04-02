import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AssetFactory() {
  const navigate = useNavigate();
  useEffect(() => { navigate('/app/rwa', { replace: true }); }, [navigate]);
  return null;
}
