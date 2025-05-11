// src/components/EditItineraryPage.jsx
import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../AuthContext';
import ItineraryPlanner from './ItineraryPlanner';

export default function EditItineraryPage() {
  const { itineraryId } = useParams();
  const { token }       = useContext(AuthContext);
  const navigate        = useNavigate();

  const [plannerProps, setPlannerProps] = useState(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);

  useEffect(() => {
    if (!token) return;

    setLoading(true);
    axios
      .get(`/api/v1/itineraries/${itineraryId}/`, {
        headers: { Authorization: `Token ${token}` }
      })
      .then(({ data }) => {
        // 1) Serializer’dan gelen yer detayları
        const placesDetails = Array.isArray(data.places_details)
          ? data.places_details.map(p => ({
              external_id: p.external_id,
              name:        p.name,
              latitude:    parseFloat(p.latitude),
              longitude:   parseFloat(p.longitude),
              category:    p.category
            }))
          : [];

        // 2) start_location / end_location JSONField’ından geliyorsa kullan
        //    Aksi halde placesDetails[0] ve placesDetails[last]
        let initialLoc = data.start_location;
        if (
          !initialLoc ||
          initialLoc.latitude == null ||
          initialLoc.longitude == null
        ) {
          if (placesDetails.length > 0) {
            const first = placesDetails[0];
            initialLoc = {
              external_id: first.external_id,
              name:        first.name,
              latitude:    first.latitude,
              longitude:   first.longitude
            };
          } else {
            initialLoc = {
              external_id: '__start__',
              name:        'Başlangıç',
              latitude:    0,
              longitude:   0
            };
          }
        }

        let finishLoc = data.end_location;
        if (
          !finishLoc ||
          finishLoc.latitude == null ||
          finishLoc.longitude == null
        ) {
          if (placesDetails.length > 0) {
            const last = placesDetails[placesDetails.length - 1];
            finishLoc = {
              external_id: last.external_id,
              name:        last.name,
              latitude:    last.latitude,
              longitude:   last.longitude
            };
          } else {
            finishLoc = {
              external_id: '__end__',
              name:        'Bitiş',
              latitude:    0,
              longitude:   0
            };
          }
        }

        // 3) Düzenleme objesi
        const editingItinerary = {
          id:    data.id,
          name:  data.name,
          route: data.route
        };

        // 4) ItineraryPlanner’a props olarak geç
        setPlannerProps({
          suggestions:      data.suggestions || [],  // AI önerileri
          initialLocation:  initialLoc,
          finishLocation:   finishLoc,
          editingItinerary
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
  }, [itineraryId, token, navigate]);

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
