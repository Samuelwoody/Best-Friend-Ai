from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_identity_generation_and_media_plan_flow():
    owner_id = "f1f8fd8d-baa5-4a50-8de1-6f61f41234ab"
    create_response = client.post(
        "/agents",
        json={
            "name": "Nova",
            "description": "Friendly mentor for daily planning",
            "owner_id": owner_id,
        },
    )
    assert create_response.status_code == 200
    agent_id = create_response.json()["data"]["id"]

    generate_response = client.post(
        f"/agents/{agent_id}/identity/generate",
        json={
            "enable_media_identity_generation": True,
            "image_style_hint": "clean editorial",
            "voice_style_hint": "calm coach",
        },
    )
    assert generate_response.status_code == 200
    generated_identity = generate_response.json()["data"]
    assert generated_identity["contract_version"] == "v1"

    read_response = client.get(f"/agents/{agent_id}/identity")
    assert read_response.status_code == 200

    media_plan_response = client.post(f"/agents/{agent_id}/identity/media-plan")
    assert media_plan_response.status_code == 200
    tasks = media_plan_response.json()["data"]["tasks"]
    assert {task["task_type"] for task in tasks} == {"image", "voice"}
