export interface Milestone {

    label: string;
    group?: string;

}

export interface MilestoneGroup {
    name: string;
    props?: { color?: string };
}