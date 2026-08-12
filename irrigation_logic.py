def determine_irrigation(moisture, net_irrigation, rain, kc, stage_name):
    if rain > 8:
        return "skip"

    if moisture < 30 or (moisture < 35 and kc >= 0.65):
        return "irrigate"

    if moisture < 38 and net_irrigation > 15:
        return "irrigate"

    if 38 <= moisture <= 50:
        return "wait"

    return "wait"