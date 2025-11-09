// CRUD helpers for orgs, buildings, rooms, memberships, reservations

const db = {
  // Profiles
  async getProfile() {
    const session = await getSession();
    if (!session) return null;
    const { data, error } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("user_id", session.user.id)
      .single();
    if (error) throw error;
    return data;
  },
  async updateProfile({ first_name, last_name, email }) {
    const session = await getSession();
    const { data, error } = await supabaseClient
      .from("profiles")
      .update({ first_name, last_name, email })
      .eq("user_id", session.user.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Organizations
  async listMyOrganizationsRoleOwner() {
    const session = await getSession();
    // Owner: organizations.owner_id == me
    const { data, error } = await supabaseClient
      .from("organizations")
      .select("*, buildings(*), rooms(*)")
      .eq("owner_id", session.user.id);
    if (error) throw error;
    return data || [];
  },

  async listMyOrganizationsMembership() {
    const session = await getSession();
    const { data, error } = await supabaseClient
      .from("memberships")
      .select("role, organizations(id, name, org_type, is_private, owner_id)")
      .eq("user_id", session.user.id);
    if (error) throw error;
    return (data || []).map(r => ({ role: r.role, ...r.organizations }));
  },

  async createOrganization({ name, org_type, is_private, access_code, firstBuilding }) {
    const session = await getSession();
    const { data: org, error: oErr } = await supabaseClient
      .from("organizations")
      .insert({
        name, org_type, is_private: !!is_private,
        access_code: is_private ? access_code : null,
        owner_id: session.user.id
      })
      .select()
      .single();
    if (oErr) throw oErr;

    // Owner membership
    const { error: mErr } = await supabaseClient
      .from("memberships")
      .insert({ org_id: org.id, user_id: session.user.id, role: "owner" });
    if (mErr) throw mErr;

    // First building if provided
    if (firstBuilding?.name && firstBuilding?.building_type) {
      const { error: bErr } = await supabaseClient
        .from("buildings")
        .insert({ org_id: org.id, name: firstBuilding.name, building_type: firstBuilding.building_type });
      if (bErr) throw bErr;
    }

    return org;
  },

  async deleteOrganization(orgId, confirmationName) {
    const { data, error } = await supabaseClient
      .from("organizations")
      .select("name, id, owner_id")
      .eq("id", orgId)
      .single();
    if (error) throw error;
    if (data.name !== confirmationName) throw new Error("Le nom saisi ne correspond pas.");

    const { error: delErr } = await supabaseClient
      .from("organizations")
      .delete()
      .eq("id", orgId);
    if (delErr) throw delErr;
    return true;
  },

  async searchOrganizations({ query = "", org_type = "tous" }) {
    let request = supabaseClient.from("organizations").select("id, name, org_type, is_private");
    if (query) request = request.ilike("name", `%${query}%`);
    if (org_type && org_type.toLowerCase() !== "tous") request = request.eq("org_type", org_type);
    const { data, error } = await request;
    if (error) throw error;
    return data || [];
  },

  async joinOrganization({ org_id, access_code }) {
    const session = await getSession();
    // retrieve org
    const { data: org, error } = await supabaseClient
      .from("organizations")
      .select("id, is_private, access_code")
      .eq("id", org_id)
      .single();
    if (error) throw error;
    if (org.is_private && org.access_code !== access_code) throw new Error("Code d'accès invalide.");

    // insert membership if not exists
    const { error: mErr } = await supabaseClient
      .from("memberships")
      .insert({ org_id, user_id: session.user.id, role: "member" });
    if (mErr && !String(mErr.message).includes("duplicate")) throw mErr;
    return true;
  },

  async leaveOrganization(org_id) {
    const session = await getSession();
    // block if owner
    const { data: org, error: oErr } = await supabaseClient
      .from("organizations")
      .select("owner_id")
      .eq("id", org_id)
      .single();
    if (oErr) throw oErr;
    if (org.owner_id === session.user.id) throw new Error("Vous êtes le responsable, vous ne pouvez pas quitter.");

    const { error: delErr } = await supabaseClient
      .from("memberships")
      .delete()
      .eq("org_id", org_id)
      .eq("user_id", session.user.id);
    if (delErr) throw delErr;
    return true;
  },

  async listBuildings(org_id) {
    const { data, error } = await supabaseClient
      .from("buildings")
      .select("*")
      .eq("org_id", org_id)
      .order("name", { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async addBuilding(org_id, name, building_type) {
    const { data, error } = await supabaseClient
      .from("buildings")
      .insert({ org_id, name, building_type })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteBuilding(building_id) {
    const { error } = await supabaseClient
      .from("buildings")
      .delete()
      .eq("id", building_id);
    if (error) throw error;
    return true;
  },

  async listRooms(org_id) {
    const { data, error } = await supabaseClient
      .from("rooms")
      .select("*, buildings(name)")
      .eq("org_id", org_id)
      .order("name", { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async addRoom(payload) {
    // validation
    const requiredFields = ["org_id","building_id","name","room_type","floor","available_start","available_end","capacity","status"];
    for (const f of requiredFields) {
      if (payload[f] === undefined || payload[f] === null || payload[f] === "") {
        throw new Error("Remplissez les éléments manquants");
      }
    }
    if (payload.floor < -10 || payload.floor > 100) throw new Error("Étage entre -10 et +100");
    // 04:00 to 23:00
    // Simple client-side check
    const startH = parseInt(String(payload.available_start).split(":")[0], 10);
    const endH = parseInt(String(payload.available_end).split(":")[0], 10);
    if (startH < 4 || endH > 23) throw new Error("Horaires entre 4h00 et 23h00 inclus");

    const { data, error } = await supabaseClient
      .from("rooms")
      .insert({
        org_id: payload.org_id,
        building_id: payload.building_id,
        name: payload.name,
        room_type: payload.room_type,
        floor: payload.floor,
        location: payload.location || null,
        available_start: payload.available_start,
        available_end: payload.available_end,
        access_code_required: !!payload.access_code_required,
        capacity: payload.capacity,
        equipment: payload.equipment || [],
        restrictions: payload.restrictions || null,
        status: payload.status
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async searchAvailableRooms({ org_id, building_id, date, start_time, end_time, min_capacity, equipment = [], room_type }) {
    // Fetch rooms matching filters
    let query = supabaseClient.from("rooms").select("*, buildings(name)").eq("org_id", org_id).eq("status", "active");

    if (building_id && building_id !== "tous") query = query.eq("building_id", building_id);
    if (room_type && room_type !== "indifférent") query = query.eq("room_type", room_type);
    const { data: rooms, error: rErr } = await query;
    if (rErr) throw rErr;

    // Filter by capacity and equipment client-side
    const filtered = (rooms || []).filter(room => {
      const capacityOk = min_capacity ? room.capacity >= min_capacity : true;
      const equipmentOk = equipment.length === 0
        ? true
        : equipment.every(req => (room.equipment || []).includes(req));
      // availability window simple check
      const startH = parseInt(start_time.split(":")[0], 10);
      const endH = parseInt(end_time.split(":")[0], 10);
      const roomStartH = parseInt(String(room.available_start).split(":")[0], 10);
      const roomEndH = parseInt(String(room.available_end).split(":")[0], 10);
      const windowOk = startH >= roomStartH && endH <= roomEndH;

      return capacityOk && equipmentOk && windowOk;
    });

    // Exclude conflicts by checking existing reservations
    const dayStart = new Date(date + "T00:00:00");
    const dayEnd = new Date(date + "T23:59:59");
    const { data: reservations, error: resErr } = await supabaseClient
      .from("reservations")
      .select("*")
      .eq("org_id", org_id)
      .gte("start_at", dayStart.toISOString())
      .lte("end_at", dayEnd.toISOString());
    if (resErr) throw resErr;

    function overlaps(s1, e1, s2, e2) {
      return (s1 < e2 && s2 < e1);
    }
    const desiredStart = new Date(`${date}T${start_time}:00`);
    const desiredEnd = new Date(`${date}T${end_time}:00`);

    const freeRooms = filtered.filter(room => {
      const conflicts = (reservations || []).filter(r => r.room_id === room.id);
      return conflicts.every(r => !overlaps(new Date(r.start_at), new Date(r.end_at), desiredStart, desiredEnd));
    });

    // Sort by relevance: capacity close, equipment matches count
    const scored = freeRooms.map(room => {
      const capacityDiff = Math.abs((min_capacity || 0) - room.capacity);
      const matchCount = equipment.filter(e => (room.equipment || []).includes(e)).length;
      return { room, score: capacityDiff - matchCount * 2 };
    });
    return scored.sort((a,b) => a.score - b.score).map(s => s.room);
  },

  async createReservation({ org_id, building_id, room_id, date, start_time, end_time, participants }) {
    const session = await getSession();
    const start_at = new Date(`${date}T${start_time}:00`);
    const end_at = new Date(`${date}T${end_time}:00`);

    const { data, error } = await supabaseClient
      .from("reservations")
      .insert({
        org_id, building_id, room_id,
        user_id: session.user.id,
        start_at: start_at.toISOString(),
        end_at: end_at.toISOString(),
        participants,
        status: "active"
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async listMyReservations() {
    const session = await getSession();
    const { data, error } = await supabaseClient
      .from("reservations")
      .select("*, rooms(name, room_type, floor, building_id), buildings(name), organizations(name)")
      .eq("user_id", session.user.id)
      .order("start_at", { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async updateReservation(id, updates) {
    const { data, error } = await supabaseClient
      .from("reservations")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async cancelReservation(id) {
    const { data, error } = await supabaseClient
      .from("reservations")
      .update({ status: "cancelled" })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};

window.db = db;
