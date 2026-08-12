from irrigation_logic import determine_irrigation


def test_low_soil_moisture():
    result = determine_irrigation(
        moisture=25,
        net_irrigation=10,
        rain=2,
        kc=0.40,
        stage_name="Germination"
    )

    assert result == "irrigate"


def test_high_rainfall():
    result = determine_irrigation(
        moisture=40,
        net_irrigation=10,
        rain=10,
        kc=0.65,
        stage_name="Tillering"
    )

    assert result == "skip"


def test_adequate_moisture():
    result = determine_irrigation(
        moisture=42,
        net_irrigation=10,
        rain=2,
        kc=0.65,
        stage_name="Tillering"
    )

    assert result == "wait"


def test_low_moisture_during_tillering():
    result = determine_irrigation(
        moisture=33,
        net_irrigation=10,
        rain=2,
        kc=0.65,
        stage_name="Tillering"
    )

    assert result == "irrigate"


def test_moderate_moisture_high_irrigation_need():
    result = determine_irrigation(
        moisture=36,
        net_irrigation=20,
        rain=2,
        kc=0.65,
        stage_name="Tillering"
    )

    assert result == "irrigate"