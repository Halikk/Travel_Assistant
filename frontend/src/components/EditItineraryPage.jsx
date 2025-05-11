// src/components/EditItineraryPage.jsx
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../AuthContext';
import ItineraryPlanner from './ItineraryPlanner';

export default function EditItineraryPage() {
  const { itineraryId } = useParams();
  const { token }      = useContext(AuthContext);
  const navigate       = useNavigate();
  const location       = useLocation();

  // Eğer PlanView’den router state ile suggestions geldiyse al,
  // yoksa boş dizi
  const originalSuggestions = useMemo(
    () => location.state?.suggestions || [],
    [location.state]
  );

  const [plannerProps, setPlannerProps] = useState(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);

  useEffect(() => {
    if (!token) return;

    axios
      .get(`/api/v1/itineraries/${itineraryId}/`, {
        headers: { Authorization: `Token ${token}` }
      })
      .then(response => {
        const data = response.data;

        // Destructure tüm ihtiyacımız olan alanları
        const {
          places_details,    // serializer’daki source='places_in_order'
          suggestions,
          route,
          name,
          id
        } = data;

        // 1) Başlangıç konumu = places_details[0]
        let initialLoc;
        if (Array.isArray(places_details) && places_details.length > 0) {
          const first = places_details[0];
          initialLoc = {
            external_id: first.external_id,
            name:        first.name,
            latitude:    parseFloat(first.latitude),
            longitude:   parseFloat(first.longitude),
            address:     first.address || ''
          };
        } else {
          initialLoc = {
            external_id: '__start__',
            name:        'Başlangıç',
            latitude:    0,
            longitude:   0,
            address:     ''
          };
        }

        // 2) Bitiş konumu = places_details[last]
        let finishLoc;
        if (Array.isArray(places_details) && places_details.length > 1) {
          const last = places_details[places_details.length - 1];
          finishLoc = {
            external_id: last.external_id,
            name:        last.name,
            latitude:    parseFloat(last.latitude),
            longitude:   parseFloat(last.longitude),
            address:     last.address || ''
          };
        } else {
          finishLoc = {
            external_id: '__end__',
            name:        'Bitiş',
            latitude:    0,
            longitude:   0,
            address:     ''
          };
        }

        // 3) editingItinerary objesi
        const editingItinerary = { id, name, route };

        // 4) plannerProps’u set et
       setPlannerProps({
  suggestions:     data.suggestions,
  initialLocation: data.start_location,   // ← artık backend’den geliyor
  finishLocation:  data.end_location,     // ← artık backend’den geliyor
  editingItinerary: {
    id:    data.id,
    name:  data.name,
    route: data.route
  }
});
      })
      .catch(err => {
        if (err.response?.status === 404) {
          setError('Seyahat planı bulunamadı.');
        } else if (err.response?.status === 401) {
          setError('Giriş yapmanız gerekiyor.');
          navigate('/login');
        } else {
          setError('Veri yüklenirken bir hata oluştu.');
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [itineraryId, token, originalSuggestions, navigate]);

  if (loading) {
    return <div className="text-center p-10">Yükleniyor…</div>;
  }
  if (error) {
    return <div className="text-center p-10 text-red-600">{error}</div>;
  }

  return (
    <ItineraryPlanner
      suggestions     ={plannerProps.suggestions}
      initialLocation ={plannerProps.initialLocation}
      finishLocation  ={plannerProps.finishLocation}
      editingItinerary={plannerProps.editingItinerary}
    />
  );
}
