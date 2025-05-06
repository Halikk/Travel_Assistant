import googlemaps
from django.conf import settings
from ortools.constraint_solver import routing_enums_pb2, pywrapcp

# Google Maps client
gmaps = googlemaps.Client(key=settings.GOOGLE_PLACES_API_KEY)

def create_distance_matrix(locations: list[tuple[float, float]]) -> list[list[int]]:
    """
    Gerçek sürüş mesafeleriyle (driving) mesafe matrisi oluşturur.
    locations: [(lat,lng), ...]
    return: matrix[i][j] = locations[i] → locations[j] arası metre cinsinden
    """
    n = len(locations)
    matrix = [[0] * n for _ in range(n)]

    for i in range(n):
        for j in range(n):
            if i == j:
                continue
            # Directions API ile sürüş mesafesini al
            try:
                res = gmaps.directions(
                    origins=[locations[i]],
                    destinations=[locations[j]],
                    mode='driving',
                    units='metric'
                )
                # Leg’lerin distance değeri metre cinsinden
                dist = res[0]['legs'][0]['distance']['value']
                matrix[i][j] = dist
            except Exception as e:
                # API hatasında çok büyük değer ata
                print(f"Error fetching driving distance {locations[i]}→{locations[j]}: {e}")
                matrix[i][j] = 10**9
    return matrix

def solve_tsp(locations: list[tuple[float, float]],
              start_index: int = 0,
              end_index: int | None = None) -> list[int] | None:
    """
    Gerçek yol mesafesi kullanarak TSP çözer.
    return: noktaların sıralı index listesi ([start,…,end])
    """
    if end_index is None:
        end_index = start_index

    # 1) Distance matrix
    dist_matrix = create_distance_matrix(locations)

    # 2) OR-Tools setup
    mgr = pywrapcp.RoutingIndexManager(len(dist_matrix), 1, start_index, end_index)
    routing = pywrapcp.RoutingModel(mgr)

    # 3) Cost callback
    def cost_cb(from_idx, to_idx):
        i = mgr.IndexToNode(from_idx)
        j = mgr.IndexToNode(to_idx)
        return dist_matrix[i][j]

    transit = routing.RegisterTransitCallback(cost_cb)
    routing.SetArcCostEvaluatorOfAllVehicles(transit)

    # 4) Search parameters
    params = pywrapcp.DefaultRoutingSearchParameters()
    params.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    )

    # 5) Solve
    sol = routing.SolveWithParameters(params)
    if sol is None:
        return None

    # 6) Extract route
    index = routing.Start(0)
    route = []
    while not routing.IsEnd(index):
        route.append(mgr.IndexToNode(index))
        index = sol.Value(routing.NextVar(index))
    route.append(mgr.IndexToNode(index))
    return route
